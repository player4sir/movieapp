import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, validateAccessToken } from '@/services/auth.service';
import { getReferralStats } from '@/services/referral.service';
import { getConfig } from '@/services/config.service';

/**
 * GET /api/user/referral
 * Get current user's referral stats and reward config
 */
// Force dynamic rendering to fix build errors with headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const token = extractBearerToken(request);
        if (!token) {
            return NextResponse.json({ code: 'UNAUTHORIZED', message: '未登录' }, { status: 401 });
        }

        const payload = validateAccessToken(token);

        // Parallel fetch for stats and config
        const [stats, inviterConfig, inviteeConfig] = await Promise.all([
            getReferralStats(payload.userId),
            getConfig('referral_reward_inviter'),
            getConfig('referral_reward_invitee')
        ]);

        return NextResponse.json({
            ...stats,
            rewards: {
                inviter: Number(inviterConfig.value),
                invitee: Number(inviteeConfig.value)
            }
        });
    } catch (error) {
        console.error('Failed to get referral stats:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取推广数据失败' },
            { status: 500 }
        );
    }
}
