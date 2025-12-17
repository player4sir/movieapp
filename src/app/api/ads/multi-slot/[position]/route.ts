/**
 * Multi-Ad Slot API
 * GET /api/ads/multi-slot/[position] - Get all ads for a specific slot position
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getAllAdsForPosition } from '@/services/ad.service';

interface RouteParams {
    params: Promise<{ position: string }>;
}

/**
 * GET /api/ads/multi-slot/[position]
 * Fetch all ads for a specific slot position.
 * Returns multiple ads with slot configuration for multi-ad display.
 * 
 * Response:
 * - ads: Array of ad objects
 * - slotId: Slot ID for tracking
 * - slotConfig: Configuration for display (maxVisible, carouselInterval, etc.)
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    const { position } = await params;

    if (!position || position.trim() === '') {
        return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'Position is required' },
            { status: 400 }
        );
    }

    try {
        // Try to authenticate user (optional)
        const authResult = await authenticateRequest(request);

        const context = authResult.success && authResult.user
            ? {
                userId: authResult.user.id,
                memberLevel: authResult.user.memberLevel,
            }
            : undefined;

        // Get all ads for the position
        const result = await getAllAdsForPosition(position, context);

        if (!result) {
            return NextResponse.json(
                {
                    ads: [],
                    slotId: null,
                    slotConfig: null
                },
                { status: 200 }
            );
        }

        // Return all ads with slot configuration
        return NextResponse.json({
            ads: result.ads.map(ad => ({
                id: ad.id,
                title: ad.title,
                imageUrl: ad.imageUrl,
                targetUrl: ad.targetUrl,
            })),
            slotId: result.slotId,
            slotConfig: result.slotConfig,
        });
    } catch (error) {
        console.error('Get multi-ad slot error:', error);

        return NextResponse.json(
            { ads: [], slotId: null, slotConfig: null },
            { status: 200 }
        );
    }
}
