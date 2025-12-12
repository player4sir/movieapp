/**
 * Ad Click API
 * POST /api/ads/click - Record an ad click and return target URL
 * 
 * Requirements: 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { recordClick, getAd } from '@/services/ad.service';

interface ClickRequest {
  adId: string;
  slotId: string;
}

/**
 * POST /api/ads/click
 * Record an ad click and return the target URL for redirect.
 * 
 * Requirements: 3.3 - Record click and redirect to target URL
 * 
 * Request body:
 * - adId: string (required) - The ad that was clicked
 * - slotId: string (required) - The slot where the ad was displayed
 * 
 * Response:
 * - success: boolean
 * - targetUrl: string - URL to redirect to
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ClickRequest = await request.json();

    // Validate required fields
    if (!body.adId || typeof body.adId !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'adId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.slotId || typeof body.slotId !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'slotId is required and must be a string' },
        { status: 400 }
      );
    }

    // Get the ad to retrieve target URL
    const ad = await getAd(body.adId);
    if (!ad) {
      return NextResponse.json(
        { code: 'AD_NOT_FOUND', message: '广告不存在' },
        { status: 404 }
      );
    }

    // Try to get user ID if authenticated (optional)
    const authResult = await authenticateRequest(request);
    const userId = authResult.success && authResult.user 
      ? authResult.user.id 
      : undefined;

    // Record the click
    // Requirements: 3.3 - Record click with timestamp and user context
    await recordClick(body.adId, body.slotId, userId);

    // Return target URL for redirect
    return NextResponse.json(
      { 
        success: true,
        targetUrl: ad.targetUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Record click error:', error);
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '记录点击失败' },
      { status: 500 }
    );
  }
}
