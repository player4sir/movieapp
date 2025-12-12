/**
 * Ad Impression API
 * POST /api/ads/impression - Record an ad impression
 * 
 * Requirements: 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { recordImpression } from '@/services/ad.service';

interface ImpressionRequest {
  adId: string;
  slotId: string;
}

/**
 * POST /api/ads/impression
 * Record an ad impression with adId, slotId, and optional userId.
 * 
 * Requirements: 3.2 - Record impression with timestamp and user context
 * 
 * Request body:
 * - adId: string (required) - The ad that was displayed
 * - slotId: string (required) - The slot where the ad was displayed
 * 
 * Response:
 * - success: boolean
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ImpressionRequest = await request.json();

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

    // Try to get user ID if authenticated (optional)
    const authResult = await authenticateRequest(request);
    const userId = authResult.success && authResult.user 
      ? authResult.user.id 
      : undefined;

    // Record the impression
    // Requirements: 3.2 - Record impression with timestamp and user context
    await recordImpression(body.adId, body.slotId, userId);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Record impression error:', error);
    
    // Return success anyway to not break client-side tracking
    // Impression tracking should be fire-and-forget
    return NextResponse.json(
      { success: false },
      { status: 200 }
    );
  }
}
