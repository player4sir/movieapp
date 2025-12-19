import { db } from '@/db';
import { users, coinTransactions, coinConfigs } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { addCoins } from './coin.service';

/**
 * Generate a random referral code (alphanumeric, 6 chars)
 */
function generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate a unique referral code for a user.
 * Tries up to 3 times to find a unique code.
 */
export async function generateReferralCode(): Promise<string> {
    let code = generateCode();
    let retries = 0;

    while (retries < 3) {
        const existing = await db.query.users.findFirst({
            where: eq(users.referralCode, code),
            columns: { id: true }
        });

        if (!existing) {
            return code;
        }

        code = generateCode();
        retries++;
    }

    throw new Error('Failed to generate unique referral code');
}

/**
 * Process referral: Link new user to inviter and distribute rewards.
 * 
 * Supports two types of codes:
 * - Agent Code (starts with 'A'): Links to agent for commission tracking
 * - Referral Code: Regular user invitation for coin rewards
 * 
 * Rewards (for regular referral):
 * - Inviter: 50 coins
 * - Invitee: 10 coins
 */
export async function processReferral(newUserId: string, referralCode: string): Promise<void> {
    if (!referralCode) return;

    // Import agent-related modules
    const { agentProfiles } = await import('@/db/schema');

    // Check if this is an agent code (starts with 'A')
    const isAgentCode = referralCode.startsWith('A') && referralCode.length === 8;

    let inviterId: string | null = null;

    if (isAgentCode) {
        // Find agent by agentCode
        const agentProfile = await db.query.agentProfiles.findFirst({
            where: eq(agentProfiles.agentCode, referralCode),
            columns: { userId: true, status: true }
        });

        if (agentProfile && agentProfile.status === 'active') {
            inviterId = agentProfile.userId;
        }
    }

    // If not found as agent code, try as regular referral code
    if (!inviterId) {
        const inviter = await db.query.users.findFirst({
            where: eq(users.referralCode, referralCode),
            columns: { id: true }
        });
        inviterId = inviter?.id || null;
    }

    if (!inviterId) {
        console.warn(`Invalid referral/agent code used: ${referralCode} by user ${newUserId}`);
        return;
    }

    if (inviterId === newUserId) {
        // Self-referral protection
        return;
    }

    // Fetch reward configurations
    const [inviterRewardConfig, inviteeRewardConfig] = await Promise.all([
        db.query.coinConfigs.findFirst({ where: eq(coinConfigs.key, 'referral_reward_inviter') }),
        db.query.coinConfigs.findFirst({ where: eq(coinConfigs.key, 'referral_reward_invitee') })
    ]);

    // Parse rewards, default to 50 (inviter) and 10 (invitee)
    const inviterReward = inviterRewardConfig ? Number(inviterRewardConfig.value) : 50;
    const inviteeReward = inviteeRewardConfig ? Number(inviteeRewardConfig.value) : 10;

    // Use transaction for consistency
    await db.transaction(async (tx) => {
        // 2. Link User (Update referredBy)
        await tx.update(users)
            .set({ referredBy: inviterId })
            .where(eq(users.id, newUserId));

        // 3. Reward Inviter (coin rewards for referrals)
        // Pass tx to ensure atomicity with the referral link update
        if (inviterReward > 0) {
            await addCoins(
                inviterId,
                inviterReward,
                'promotion',
                '邀请好友奖励',
                { invitedUserId: newUserId },
                tx
            );
        }

        // Track recruit for agent system (regardless of coin rewards)
        const { trackRecruit } = await import('./agent.service');
        trackRecruit(inviterId).catch(console.error);

        // 4. Reward Invitee
        if (inviteeReward > 0) {
            await addCoins(
                newUserId,
                inviteeReward,
                'promotion',
                '新人注册奖励',
                { inviterId, code: referralCode },
                tx
            );
        }
    });
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{ inviteCount: number; totalIncome: number }> {
    // Count invites
    const [inviteCountResult] = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.referredBy, userId));

    // Sum promotion income
    const [incomeResult] = await db.select({ total: sql<number>`sum(${coinTransactions.amount})` })
        .from(coinTransactions)
        .where(and(
            eq(coinTransactions.userId, userId),
            eq(coinTransactions.type, 'promotion')
        ));

    return {
        inviteCount: Number(inviteCountResult?.count ?? 0),
        totalIncome: Number(incomeResult?.total ?? 0)
    };
}
