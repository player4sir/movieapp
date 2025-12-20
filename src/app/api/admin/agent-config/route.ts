/**
 * Agent Config API
 * GET/PUT /api/admin/agent-config - Read/save agent system configuration
 * Uses siteSettings table to store configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const CONFIG_KEY = 'agent_system_config';

const DEFAULT_CONFIG = {
    trackingExpiryDays: 30,
    autoUpgradeEnabled: true,
    minWithdrawAmount: 10000, // 100 yuan in cents
};

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const setting = await db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, CONFIG_KEY),
        });

        if (!setting) {
            return NextResponse.json({ data: DEFAULT_CONFIG });
        }

        return NextResponse.json({ data: JSON.parse(setting.value) });
    } catch (error) {
        console.error('Failed to get agent config:', error);
        return NextResponse.json({ data: DEFAULT_CONFIG });
    }
}

export async function PUT(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const body = await request.json();

        const config = {
            trackingExpiryDays: body.trackingExpiryDays ?? DEFAULT_CONFIG.trackingExpiryDays,
            autoUpgradeEnabled: body.autoUpgradeEnabled ?? DEFAULT_CONFIG.autoUpgradeEnabled,
            minWithdrawAmount: body.minWithdrawAmount ?? DEFAULT_CONFIG.minWithdrawAmount,
        };

        const existing = await db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, CONFIG_KEY),
        });

        if (existing) {
            await db
                .update(siteSettings)
                .set({ value: JSON.stringify(config), updatedAt: new Date() })
                .where(eq(siteSettings.key, CONFIG_KEY));
        } else {
            await db.insert(siteSettings).values({
                id: crypto.randomUUID(),
                key: CONFIG_KEY,
                value: JSON.stringify(config),
                description: '代理商系统配置',
                updatedAt: new Date(),
            });
        }

        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        console.error('Failed to save agent config:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '保存配置失败' },
            { status: 500 }
        );
    }
}
