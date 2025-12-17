/**
 * Ad Slot API
 * GET /api/ads/slot/[position] - Get ad for a specific slot position
 * 
 * Requirements: 3.1, 3.4, 4.1, 4.2, 4.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getAdForPosition } from '@/services/ad.service';

interface RouteParams {
  params: Promise<{ position: string }>;
}

/**
 * GET /api/ads/slot/[position]
 * Fetch ad for a specific slot position based on user context.
 * 
 * - Returns null/empty for VIP/SVIP users (Requirements: 4.1, 4.2)
 * - Returns ad for free users (Requirements: 4.3)
 * - Handles missing slot gracefully (Requirements: 3.4)
 * 
 * Response:
 * - ad: Ad object or null if no ad available
 * - slotId: Slot ID for tracking purposes
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { position } = await params;

  // Validate position parameter
  if (!position || position.trim() === '') {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Position is required' },
      { status: 400 }
    );
  }

  try {
    // Try to authenticate user (optional - anonymous users can also see ads)
    const authResult = await authenticateRequest(request);

    // Build delivery context
    const context = authResult.success && authResult.user
      ? {
        userId: authResult.user.id,
        memberLevel: authResult.user.memberLevel,
        // groupId could be added if user has group association
      }
      : undefined;

    // Get ad for the position
    // Requirements: 3.1 - Display active ad from slot
    // Requirements: 4.1, 4.2 - VIP/SVIP users get null
    // Requirements: 4.3 - Free users see ads
    const ad = await getAdForPosition(position, context);

    // Requirements: 3.4 - Handle missing slot gracefully
    if (!ad) {
      return NextResponse.json(
        { ad: null, slotId: null },
        { status: 200 }
      );
    }

    // Return ad data for display
    return NextResponse.json(
      {
        ad: {
          id: ad.id,
          title: ad.title,
          imageUrl: ad.imageUrl,
          targetUrl: ad.targetUrl,
        },
        slotId: ad.slotId,
        displayMode: ad.displayMode ?? 'cover',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get ad for slot error:', error);

    // Graceful degradation - return empty response instead of error
    // This ensures ads don't break the page layout
    return NextResponse.json(
      { ad: null, slotId: null },
      { status: 200 }
    );
  }
}
