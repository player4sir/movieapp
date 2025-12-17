/**
 * Admin Site Settings API Route
 * Manage global site configuration (name, logo, copyright, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Default settings if not configured
const DEFAULT_SETTINGS = {
    site_name: '影视流媒体',
    site_description: '移动端影视流媒体应用，提供影视内容浏览、搜索、播放功能',
    site_logo: '',
    site_copyright: '© 2024 影视流媒体',
};

// type SettingKey = keyof typeof DEFAULT_SETTINGS;
type SettingKey = string;

/**
 * GET /api/admin/site-settings
 * Get all site settings
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const settings = await db.select().from(siteSettings);

        // Merge with defaults
        const result: Record<string, string> = { ...DEFAULT_SETTINGS };
        for (const setting of settings) {
            result[setting.key] = setting.value;
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to fetch site settings:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取站点设置失败' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/site-settings
 * Update site settings
 */
export async function PUT(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const body = await request.json();
        const { site_name, site_description, site_logo, site_copyright } = body;

        // Validate required fields
        if (site_name !== undefined && (!site_name || typeof site_name !== 'string')) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '站点名称不能为空' },
                { status: 400 }
            );
        }

        const now = new Date();
        const updates: { key: SettingKey; value: string; description: string }[] = [];

        if (site_name !== undefined) {
            updates.push({ key: 'site_name', value: site_name, description: '站点名称' });
        }
        if (site_description !== undefined) {
            updates.push({ key: 'site_description', value: site_description, description: '站点描述' });
        }
        if (site_logo !== undefined) {
            updates.push({ key: 'site_logo', value: site_logo, description: '站点Logo URL' });
        }
        if (site_copyright !== undefined) {
            updates.push({ key: 'site_copyright', value: site_copyright, description: '版权信息' });
        }

        // Add support for arbitrary keys or specifically faq_config
        const { faq_config } = body;
        if (faq_config !== undefined) {
            updates.push({ key: 'faq_config', value: typeof faq_config === 'string' ? faq_config : JSON.stringify(faq_config), description: '问答配置' });
        }

        // Upsert each setting
        for (const update of updates) {
            const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, update.key)).limit(1);

            if (existing.length > 0) {
                await db.update(siteSettings)
                    .set({ value: update.value, updatedAt: now, updatedBy: authResult.user.id })
                    .where(eq(siteSettings.key, update.key));
            } else {
                await db.insert(siteSettings).values({
                    id: nanoid(),
                    key: update.key,
                    value: update.value,
                    description: update.description,
                    updatedAt: now,
                    updatedBy: authResult.user.id,
                });
            }
        }

        // Return updated settings
        const settings = await db.select().from(siteSettings);
        const result: Record<string, string> = { ...DEFAULT_SETTINGS };
        for (const setting of settings) {
            result[setting.key] = setting.value;
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update site settings:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '更新站点设置失败' },
            { status: 500 }
        );
    }
}
