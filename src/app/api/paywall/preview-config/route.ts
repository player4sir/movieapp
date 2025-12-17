/**
 * GET /api/paywall/preview-config
 * Returns preview configuration for the video player
 */

import { NextResponse } from 'next/server';
import { getPreviewConfig } from '@/services/paywall.service';

export async function GET() {
    try {
        const config = await getPreviewConfig();

        return NextResponse.json({
            percentage: config.percentage,
            minSeconds: config.minSeconds,
            maxSeconds: config.maxSeconds,
        }, { status: 200 });
    } catch (error) {
        console.error('Get preview config error:', error);

        // Return defaults on error
        return NextResponse.json({
            percentage: 0.25,
            minSeconds: 60,
            maxSeconds: 360,
        }, { status: 200 });
    }
}
