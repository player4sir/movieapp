/**
 * Content Unlock API
 * POST /api/content/unlock - Unlock content with coins
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { unlockContent, PAYWALL_ERRORS } from '@/services/paywall.service';
import { SourceCategory } from '@/db/schema';

/**
 * POST /api/content/unlock
 * Unlock content with coins.
 * 
 * Request body:
 * - vodId: Video ID (required)
 * - episodeIndex: Episode index (required, -1 for full content)
 * - sourceCategory: Content category - 'normal' or 'adult' (required)
 * 
 * Response:
 * - success: boolean
 * - coinsSpent: number - Coins deducted
 * - newBalance: number - User's new coin balance
 * - accessRecord: ContentAccess - The created access record
 * 
 * Requirements:
 * - 4.1: Verify user's coin balance is sufficient
 * - 4.2: Deduct coins and create Content_Access record
 * - 4.3: Create Coin_Transaction record with type "consume"
 * - 4.4: Reject unlock if balance insufficient
 * - 5.1: Only charge for specific episode
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { vodId, episodeIndex, sourceCategory } = body;

    // Validate vodId
    if (vodId === undefined || vodId === null) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'vodId is required' },
        { status: 400 }
      );
    }

    if (typeof vodId !== 'number' || vodId <= 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'vodId must be a positive integer' },
        { status: 400 }
      );
    }

    // Validate episodeIndex
    if (episodeIndex === undefined || episodeIndex === null) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'episodeIndex is required' },
        { status: 400 }
      );
    }

    if (typeof episodeIndex !== 'number' || episodeIndex < -1) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'episodeIndex must be -1 or a non-negative integer' },
        { status: 400 }
      );
    }

    // Validate sourceCategory
    if (!sourceCategory) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'sourceCategory is required' },
        { status: 400 }
      );
    }

    if (sourceCategory !== 'normal' && sourceCategory !== 'adult') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'sourceCategory must be "normal" or "adult"' },
        { status: 400 }
      );
    }

    const validSourceCategory: SourceCategory = sourceCategory;

    const result = await unlockContent(
      user.id,
      vodId,
      episodeIndex,
      validSourceCategory
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Unlock content error:', error);
    
    const paywallError = error as { code?: string; message?: string };
    
    // Handle specific paywall errors
    if (paywallError.code === PAYWALL_ERRORS.INSUFFICIENT_BALANCE.code) {
      return NextResponse.json(
        { 
          code: paywallError.code, 
          message: paywallError.message,
          suggestion: '您可以通过每日签到或充值获取更多金币'
        },
        { status: 400 }
      );
    }

    if (paywallError.code === PAYWALL_ERRORS.ALREADY_UNLOCKED.code) {
      return NextResponse.json(
        { code: paywallError.code, message: paywallError.message },
        { status: 400 }
      );
    }

    if (paywallError.code === PAYWALL_ERRORS.PAYWALL_DISABLED.code) {
      return NextResponse.json(
        { code: paywallError.code, message: paywallError.message },
        { status: 400 }
      );
    }

    if (paywallError.code === PAYWALL_ERRORS.USER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: paywallError.code, message: paywallError.message },
        { status: 404 }
      );
    }

    if (paywallError.code === PAYWALL_ERRORS.TRANSACTION_FAILED.code) {
      return NextResponse.json(
        { code: paywallError.code, message: paywallError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '解锁内容失败，请重试' },
      { status: 500 }
    );
  }
}
