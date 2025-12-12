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
 * Rewards:
 * - Inviter: 50 coins
 * - Invitee: 10 coins
 */
export async function processReferral(newUserId: string, referralCode: string): Promise<void> {
    if (!referralCode) return;

    // 1. Find Inviter
    const inviter = await db.query.users.findFirst({
        where: eq(users.referralCode, referralCode),
        columns: { id: true, username: true } // Fetch username for logging?
    });

    if (!inviter) {
        // Invalid code, ignore silently or log
        console.warn(`Invalid referral code used: ${referralCode} by user ${newUserId}`);
        return;
    }

    if (inviter.id === newUserId) {
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
            .set({ referredBy: inviter.id })
            .where(eq(users.id, newUserId));

        // 3. Reward Inviter
        // Pass tx to ensure atomicity with the referral link update
        if (inviterReward > 0) {
            await addCoins(
                inviter.id,
                inviterReward,
                'promotion',
                '邀请好友奖励',
                { invitedUserId: newUserId },
                tx
            );
        }

        // 4. Reward Invitee
        if (inviteeReward > 0) {
            await addCoins(
                newUserId,
                inviteeReward,
                'promotion',
                '新人注册奖励',
                { inviterId: inviter.id, code: referralCode },
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
