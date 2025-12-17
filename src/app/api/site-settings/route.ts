/**
 * Public Site Settings API Route
 * Get site settings (read-only, no auth required)
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';

// Default settings if not configured
const DEFAULT_SETTINGS = {
    site_name: '影视流媒体',
    site_description: '移动端影视流媒体应用，提供影视内容浏览、搜索、播放功能',
    site_logo: '',
    site_copyright: '© 2024 影视流媒体',
};

/**
 * GET /api/site-settings
 * Get site settings (public, no auth required)
 */
export async function GET() {
    try {
        const settings = await db.select().from(siteSettings);

        // Merge with defaults
        const result: Record<string, string> = { ...DEFAULT_SETTINGS };
        for (const setting of settings) {
            result[setting.key] = setting.value;
        }

        // No cache to ensure immediate updates
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('Failed to fetch site settings:', error);
        // Return defaults on error
        return NextResponse.json(DEFAULT_SETTINGS);
    }
}
