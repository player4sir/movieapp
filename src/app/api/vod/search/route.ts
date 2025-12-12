/**
 * GET /api/vod/search
 * Search VODs by keyword
 * 
 * Query Parameters:
 * - keyword: Search keyword (required, non-empty)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - sourceCategory: Source category ('normal' | 'adult', default: 'normal')
 * 
 * Response includes isStale flag when serving cached data due to API failure
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.4, 8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoAPI } from '@/services/video-api.service';

// Force dynamic rendering to fix build errors with searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sourceCategory = searchParams.get('sourceCategory') as 'normal' | 'adult' | null;

    // Validate keyword - reject empty or whitespace-only queries
    // Requirements: 2.2 - Empty search rejection
    if (!keyword || !keyword.trim()) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Search keyword cannot be empty' },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Page must be a positive integer' },
        { status: 400 }
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Page size must be between 1 and 100' },
        { status: 400 }
      );
    }

    const videoAPI = getVideoAPI();
    const result = await videoAPI.searchVOD(keyword.trim(), page, sourceCategory || undefined);

    // Include stale indicator in response headers for client-side handling
    const headers: HeadersInit = {};
    if (result.isStale) {
      headers['X-Data-Stale'] = 'true';
      if (result.cachedAt) {
        headers['X-Cached-At'] = result.cachedAt.toString();
      }
    }

    // Return results with search suggestions if empty
    // Requirements: 2.3 - No results handling
    if (result.data.length === 0) {
      return NextResponse.json({
        ...result,
        suggestions: ['Try different keywords', 'Check spelling', 'Use broader terms'],
      }, { status: 200, headers });
    }

    return NextResponse.json(result, { status: 200, headers });
  } catch (error: unknown) {
    console.error('VOD search error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { code: 'EXTERNAL_API_ERROR', message: errorMessage },
      { status: 502 }
    );
  }
}
