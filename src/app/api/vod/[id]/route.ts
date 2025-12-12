/**
 * GET /api/vod/[id]
 * Fetch single VOD detail by ID
 * 
 * Path Parameters:
 * - id: VOD ID
 * 
 * Query Parameters:
 * - sourceCategory: Filter by source category ('normal' or 'adult')
 * 
 * Returns VOD detail with parsed play URLs in structured format
 * Response includes isStale flag when serving cached data due to API failure
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoAPI } from '@/services/video-api.service';
import { checkAccess } from '@/services/paywall.service';
import { generatePlaybackToken } from '@/services/playback-token.service';
import { extractBearerToken } from '@/lib/auth-middleware';
import { validateAccessToken } from '@/services/auth.service';
import type { SourceCategory } from '@/services/video-source.service';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const vodId = parseInt(id, 10);

    // Get sourceCategory from query params
    const searchParams = request.nextUrl.searchParams;
    const sourceCategoryParam = searchParams.get('sourceCategory');
    const sourceCategory = (sourceCategoryParam === 'normal' || sourceCategoryParam === 'adult')
      ? sourceCategoryParam as SourceCategory
      : 'normal';

    // Validate ID
    if (isNaN(vodId) || vodId < 1) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid VOD ID' },
        { status: 400 }
      );
    }

    const videoAPI = getVideoAPI();
    const result = await videoAPI.fetchVODDetailWithStale(vodId, sourceCategory);

    if (!result.data || result.data.length === 0) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'VOD not found' },
        { status: 404 }
      );
    }

    const vodDetail = result.data[0];

    // Check Access Status
    // We need to identify the user. Token-based (JWT).
    let userId: string | undefined;

    try {
      const token = extractBearerToken(request);
      if (token) {
        const payload = validateAccessToken(token);
        userId = payload.userId;
      }
    } catch {
      // Invalid token, treat as guest
    }

    let hasAccess = false;

    // We check access for the first episode (index 0) as a baseline for the VOD. 
    if (userId) {
      try {
        // Check generic access (episode 0 is usually representative for "is VIP" check)
        const baseAccess = await checkAccess(userId, vodId, 0, sourceCategory || 'normal');
        if (baseAccess.accessType === 'vip' || baseAccess.accessType === 'free') {
          hasAccess = true;
        }
      } catch {
        // ignore
      }
    }

    // ...

    const playSources = videoAPI.parsePlayUrls(vodDetail);

    // ...

    const unlockedIndices = new Set<number>();
    if (userId) {
      try {
        const baseCheck = await checkAccess(userId, vodId, 0, sourceCategory || 'normal');
        if (baseCheck.accessType === 'vip') {
          hasAccess = true;
        } else {
          const { getUnlockedEpisodes } = await import('@/services/access.service');
          const unlocked = await getUnlockedEpisodes(userId, vodId);
          unlocked.forEach(r => unlockedIndices.add(r.episodeIndex));
        }
      } catch {
        // ignore
      }
    }

    playSources.forEach(source => {
      source.episodes.forEach((ep, index) => { // Note: index here might be array index, not logical episodeIndex?
        // `parsePlayUrls` returns episodes. We need to know their logical index for DB check.
        // Usually episode lists are sequential. Let's assume array index = episode index for now, 
        // or rely on the fact that we match what `checkAccess` uses.
        // In `parsePlayUrls`/`parsePlayUrl`, the output is just a list.
        // `checkAccess` (and `PlayPage`) uses `selectedEpisodeIndex` which corresponds to the array index of the source.
        // So yes, array index is correct.

        const isEpUnlocked = hasAccess || unlockedIndices.has(index);
        const token = generatePlaybackToken({
          url: ep.url,
          isPreview: !isEpUnlocked,
          userId: userId || undefined,
          vodId: vodId
        });

        // Replace URL with Proxy URL
        // Original: http://example.com/foo.m3u8
        // New: /api/proxy/m3u8?token=xyz
        ep.url = `/api/proxy/m3u8?token=${token}`;
      });
    });

    // Include stale indicator in response headers for client-side handling
    const headers: HeadersInit = {};
    if (result.isStale) {
      headers['X-Data-Stale'] = 'true';
      if (result.cachedAt) {
        headers['X-Cached-At'] = result.cachedAt.toString();
      }
    }

    return NextResponse.json({
      ...vodDetail,
      playSources, // Now contains proxied URLs
      isStale: result.isStale,
      cachedAt: result.cachedAt,
    }, { status: 200, headers });
  } catch (error: unknown) {
    console.error('VOD detail error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { code: 'EXTERNAL_API_ERROR', message: errorMessage },
      { status: 502 }
    );
  }
}

