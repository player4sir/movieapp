/**
 * GET /api/vod/list
 * Fetch VOD list with pagination and optional filtering
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - typeId: Filter by category type ID
 * - hours: Filter by hours since update
 * - sourceCategory: Filter by source category ('normal' or 'adult')
 * 
 * Response includes isStale flag when serving cached data due to API failure
 * 
 * Requirements: 1.1, 1.2, 1.3, 3.4, 8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoAPI } from '@/services/video-api.service';
import type { SourceCategory } from '@/services/video-source.service';

// Force dynamic rendering to fix build errors with searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const typeIdParam = searchParams.get('typeId');
    const hoursParam = searchParams.get('hours');
    const sourceCategoryParam = searchParams.get('sourceCategory');

    const typeId = typeIdParam ? parseInt(typeIdParam, 10) : undefined;
    const hours = hoursParam ? parseInt(hoursParam, 10) : undefined;
    const sourceCategory = (sourceCategoryParam === 'normal' || sourceCategoryParam === 'adult')
      ? sourceCategoryParam as SourceCategory
      : undefined;

    // Validate parameters
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
    const result = await videoAPI.fetchVODList({
      page,
      typeId,
      hours,
      sourceCategory,
    });

    // Include stale indicator and cache headers
    // HTTP cache: 1 min fresh, 5 min stale-while-revalidate
    const headers: HeadersInit = {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    };
    if (result.isStale) {
      headers['X-Data-Stale'] = 'true';
      if (result.cachedAt) {
        headers['X-Cached-At'] = result.cachedAt.toString();
      }
    }

    return NextResponse.json(result, { status: 200, headers });
  } catch (error: unknown) {
    console.error('VOD list error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { code: 'EXTERNAL_API_ERROR', message: errorMessage },
      { status: 502 }
    );
  }
}
