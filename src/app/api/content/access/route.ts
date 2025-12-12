/**
 * Content Access API
 * GET /api/content/access - Check user's access to specific content
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * 
 * @deprecated Preview feature has been removed. The 'preview' accessType is no longer returned.
 * Users without access now receive 'locked' accessType instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { checkAccess, PAYWALL_ERRORS } from '@/services/paywall.service';
import { SourceCategory } from '@/db/schema';

/**
 * GET /api/content/access
 * Check user's access to specific content.
 * 
 * Query params:
 * - vodId: Video ID (required)
 * - episodeIndex: Episode index (required, -1 for full content)
 * - sourceCategory: Content category - 'normal' or 'adult' (required)
 * 
 * Response:
 * - hasAccess: boolean - Whether user has access
 * - accessType: 'free' | 'vip' | 'purchased' | 'locked'
 *   - 'free': Content is free for all users
 *   - 'vip': User has VIP/SVIP membership granting access
 *   - 'purchased': User has previously purchased this content
 *   - 'locked': User does not have access and must pay to unlock
 * - price?: number - Unlock price in coins (only when accessType is 'locked')
 * - unlockedAt?: Date - When content was unlocked (only when accessType is 'purchased')
 * 
 * Requirements:
 * - 2.1: Display unlock price based on content category
 * - 2.2: Indicate Normal_Content is free for VIP
 * - 2.3: Indicate both content types are free for SVIP
 * - 2.4: Display unlocked status for purchased content
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;
  const searchParams = request.nextUrl.searchParams;

  // Parse and validate query parameters
  const vodIdParam = searchParams.get('vodId');
  const episodeIndexParam = searchParams.get('episodeIndex');
  const sourceCategoryParam = searchParams.get('sourceCategory');

  // Validate vodId
  if (!vodIdParam) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'vodId is required' },
      { status: 400 }
    );
  }

  const vodId = parseInt(vodIdParam, 10);
  if (isNaN(vodId) || vodId <= 0) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'vodId must be a positive integer' },
      { status: 400 }
    );
  }

  // Validate episodeIndex
  if (episodeIndexParam === null || episodeIndexParam === undefined) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'episodeIndex is required' },
      { status: 400 }
    );
  }

  const episodeIndex = parseInt(episodeIndexParam, 10);
  if (isNaN(episodeIndex) || episodeIndex < -1) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'episodeIndex must be -1 or a non-negative integer' },
      { status: 400 }
    );
  }

  // Validate sourceCategory
  if (!sourceCategoryParam) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'sourceCategory is required' },
      { status: 400 }
    );
  }

  if (sourceCategoryParam !== 'normal' && sourceCategoryParam !== 'adult') {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'sourceCategory must be "normal" or "adult"' },
      { status: 400 }
    );
  }

  const sourceCategory: SourceCategory = sourceCategoryParam;

  try {
    const accessResult = await checkAccess(
      user.id,
      vodId,
      episodeIndex,
      sourceCategory
    );

    return NextResponse.json(accessResult, { status: 200 });
  } catch (error: unknown) {
    console.error('Check content access error:', error);
    
    const paywallError = error as { code?: string; message?: string };
    
    if (paywallError.code === PAYWALL_ERRORS.USER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: paywallError.code, message: paywallError.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '检查访问权限失败，请重试' },
      { status: 500 }
    );
  }
}
