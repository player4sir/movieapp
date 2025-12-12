/**
 * GET /api/vod/categories
 * Fetch all VOD categories
 * 
 * Query Parameters:
 * - sourceCategory: Filter by source category ('normal' or 'adult')
 * 
 * Returns cached categories from Redis/memory cache
 * Response includes isStale flag when serving cached data due to API failure
 * 
 * Requirements: 1.2, 8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoAPI } from '@/services/video-api.service';
import type { SourceCategory } from '@/services/video-source.service';

// Force dynamic rendering to fix build errors with searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceCategoryParam = searchParams.get('sourceCategory');
    const sourceCategory = (sourceCategoryParam === 'normal' || sourceCategoryParam === 'adult')
      ? sourceCategoryParam as SourceCategory
      : undefined;

    console.log(`[API /vod/categories] sourceCategory param: '${sourceCategoryParam}', resolved: '${sourceCategory}'`);

    const videoAPI = getVideoAPI();
    const result = await videoAPI.fetchCategoriesWithStale(sourceCategory);

    // Categories rarely change - cache 5 min fresh, 30 min stale-while-revalidate
    const headers: HeadersInit = {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=1800',
    };
    if (result.isStale) {
      headers['X-Data-Stale'] = 'true';
      if (result.cachedAt) {
        headers['X-Cached-At'] = result.cachedAt.toString();
      }
    }

    return NextResponse.json({
      data: result.data,
      isStale: result.isStale,
      cachedAt: result.cachedAt,
    }, { status: 200, headers });
  } catch (error: unknown) {
    console.error('Categories fetch error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { code: 'EXTERNAL_API_ERROR', message: errorMessage },
      { status: 502 }
    );
  }
}
