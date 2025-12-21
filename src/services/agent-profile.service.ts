import { AgentProfileRepository } from '@/repositories/agent-profile.repository';
import { AgentLevelRepository } from '@/repositories/agent-level.repository';
import { AgentProfile, NewAgentProfile, agentProfiles } from '@/db/schema';
import { db } from '@/db';
import { eq } from 'drizzle-orm';

export const AGENT_PROFILE_ERRORS = {
    PROFILE_EXISTS: { code: 'PROFILE_EXISTS', message: '代理档案已存在' },
    PROFILE_NOT_FOUND: { code: 'PROFILE_NOT_FOUND', message: '代理档案不存在' },
    LEVEL_NOT_FOUND: { code: 'LEVEL_NOT_FOUND', message: '无效的代理等级' },
} as const;

const agentProfileRepository = new AgentProfileRepository();
const agentLevelRepository = new AgentLevelRepository();

/**
 * Generate a unique agent code (alphanumeric, 8 chars, starts with 'A')
 */
async function generateAgentCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let retries = 0;

    while (retries < 5) {
        // Generate code: A + 7 random chars
        let code = 'A';
        for (let i = 0; i < 7; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check uniqueness
        const existing = await db.query.agentProfiles.findFirst({
            where: eq(agentProfiles.agentCode, code),
            columns: { userId: true }
        });

        if (!existing) {
            return code;
        }
        retries++;
    }

    throw new Error('Failed to generate unique agent code');
}

/**
 * Get Agent Profile for a user
 */
export async function getAgentProfile(userId: string): Promise<AgentProfile | null> {
    return agentProfileRepository.findByUserId(userId);
}

/**
 * Apply for Agent Status
 * If inviteCode is provided, bind to parent agent and inherit commission rate
 */
export async function applyForAgent(
    userId: string,
    data: { realName: string; contact: string; inviteCode?: string }
): Promise<AgentProfile> {
    const existing = await agentProfileRepository.findByUserId(userId);
    if (existing) {
        if (existing.status === 'rejected') {
            // Allow re-application if rejected
            return agentProfileRepository.update(userId, {
                status: 'pending',
                realName: data.realName,
                contact: data.contact,
            }) as Promise<AgentProfile>;
        }
        throw { ...AGENT_PROFILE_ERRORS.PROFILE_EXISTS };
    }

    // Find default level (lowest sortOrder)
    const levels = await agentLevelRepository.findEnabled();
    if (levels.length === 0) {
        throw { ...AGENT_PROFILE_ERRORS.LEVEL_NOT_FOUND };
    }
    const defaultLevel = levels.sort((a, b) => a.sortOrder - b.sortOrder)[0];

    // Handle invitation by parent agent
    let parentAgentId: string | null = null;
    let level1AgentId: string | null = null;
    let level2AgentId: string | null = null;
    let commissionRate = defaultLevel.commissionRate; // Default from system level

    if (data.inviteCode) {
        const parentAgent = await agentProfileRepository.findByAgentCode(data.inviteCode);
        if (parentAgent && parentAgent.status === 'active') {
            // Always bind parent-child relationship
            parentAgentId = parentAgent.userId;
            
            // Use parent's subAgentRate if set, otherwise default to 10% (1000 basis points)
            if (parentAgent.subAgentRate > 0) {
                commissionRate = parentAgent.subAgentRate;
            } else {
                // Default commission rate for sub-agents when parent hasn't set subAgentRate
                commissionRate = 1000; // 10%
            }

            // Build the relationship chain
            if (parentAgent.level1AgentId) {
                // Parent is Level 3, this agent would be Level 4 (not allowed in 3-tier system)
                // Treat parent as Level 2, grandparent as Level 1
                level1AgentId = parentAgent.level1AgentId;
                level2AgentId = parentAgent.userId;
            } else if (parentAgent.parentAgentId) {
                // Parent is Level 2, grandparent is Level 1
                level1AgentId = parentAgent.parentAgentId;
                level2AgentId = parentAgent.userId;
            } else {
                // Parent is Level 1 (top agent)
                level1AgentId = parentAgent.userId;
                level2AgentId = null;
            }
        }
    }

    return agentProfileRepository.create({
        userId,
        levelId: defaultLevel.id,
        status: 'pending',
        realName: data.realName,
        contact: data.contact,
        totalIncome: 0,
        balance: 0,
        parentAgentId,
        level1AgentId,
        level2AgentId,
        commissionRate,
        subAgentRate: 0, // New agents start with 0, must set before inviting others
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

/**
 * Approve Agent Application (Admin)
 * Generates unique agentCode on approval
 * For top-level agents (no parent), sets commissionRate from their level
 */
export async function approveAgent(userId: string): Promise<AgentProfile> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    // Generate unique agent code if not exists
    let agentCode = profile.agentCode;
    if (!agentCode) {
        agentCode = await generateAgentCode();
    }

    // For top-level agents (no parent), set commissionRate from level configuration
    let commissionRate = profile.commissionRate;
    if (!profile.parentAgentId) {
        const level = await agentLevelRepository.findById(profile.levelId);
        if (level) {
            commissionRate = level.commissionRate;
        }
    }

    return agentProfileRepository.update(userId, {
        status: 'active',
        agentCode,
        commissionRate,
    }) as Promise<AgentProfile>;
}

/**
 * Reject Agent Application (Admin)
 */
export async function rejectAgent(userId: string): Promise<AgentProfile> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    return agentProfileRepository.update(userId, { status: 'rejected' }) as Promise<AgentProfile>;
}

/**
 * Set commission rate for sub-agents (让利设置)
 * This rate will be given to agents invited by this agent
 */
export async function setSubAgentRate(userId: string, subAgentRate: number): Promise<AgentProfile> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    // Validate: subAgentRate must be less than commissionRate
    if (subAgentRate >= profile.commissionRate) {
        throw { code: 'INVALID_RATE', message: '下级佣金率必须小于您的佣金率' };
    }

    // Validate: subAgentRate must be non-negative
    if (subAgentRate < 0) {
        throw { code: 'INVALID_RATE', message: '下级佣金率不能为负数' };
    }

    return agentProfileRepository.update(userId, { subAgentRate }) as Promise<AgentProfile>;
}

/**
 * Get team info for an agent
 */
export async function getTeamInfo(userId: string): Promise<{
    subAgents: AgentProfile[];
    teamCount: { direct: number; level2: number; level3: number; total: number };
}> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    const subAgents = await agentProfileRepository.getSubAgents(userId);
    const teamCount = await agentProfileRepository.getTeamCount(userId);

    return { subAgents, teamCount };
}

/**
 * Get parent agent info
 */
export async function getParentAgent(userId: string): Promise<AgentProfile | null> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile || !profile.parentAgentId) return null;

    return agentProfileRepository.findByUserId(profile.parentAgentId);
}

/**
 * Update Agent Profile Details (Admin)
 * Records level change log when levelId changes
 * Supports updating commissionRate and subAgentRate for top-level agents
 * When level changes for top-level agents, auto-updates commissionRate from new level
 */
export async function updateAgentProfile(
    userId: string,
    data: Partial<Pick<AgentProfile, 'realName' | 'contact' | 'levelId' | 'status' | 'commissionRate' | 'subAgentRate'>>,
    adminId?: string
): Promise<AgentProfile> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    // Check if level is changing
    if (data.levelId && data.levelId !== profile.levelId) {
        await logLevelChange(
            userId,
            profile.levelId,
            data.levelId,
            'manual',
            adminId,
            '管理员手动调整'
        );

        // For top-level agents, sync commissionRate from new level (unless explicitly provided)
        if (!profile.parentAgentId && data.commissionRate === undefined) {
            const newLevel = await agentLevelRepository.findById(data.levelId);
            if (newLevel) {
                data.commissionRate = newLevel.commissionRate;
            }
        }
    }

    return agentProfileRepository.update(userId, data) as Promise<AgentProfile>;
}

/**
 * Log a level change for audit purposes
 */
export async function logLevelChange(
    userId: string,
    previousLevelId: string | null,
    newLevelId: string,
    changeType: 'manual' | 'auto_upgrade' | 'initial',
    changedBy?: string | null,
    reason?: string
): Promise<void> {
    const { agentLevelChangeLogs } = await import('@/db/schema');

    // Get level names for snapshot
    let previousLevelName: string | null = null;
    if (previousLevelId) {
        const prevLevel = await agentLevelRepository.findById(previousLevelId);
        previousLevelName = prevLevel?.name || null;
    }

    const newLevel = await agentLevelRepository.findById(newLevelId);
    const newLevelName = newLevel?.name || 'Unknown';

    await db.insert(agentLevelChangeLogs).values({
        id: crypto.randomUUID(),
        userId,
        previousLevelId,
        previousLevelName,
        newLevelId,
        newLevelName,
        changeType,
        changedBy: changedBy || null,
        reason: reason || null,
    });

    console.log(`[Agent Level Log] User ${userId}: ${previousLevelName || 'None'} -> ${newLevelName} (${changeType})`);
}

/**
 * Check if user is an active agent
 */
export async function isUserActiveAgent(userId: string): Promise<boolean> {
    const profile = await getAgentProfile(userId);
    return profile?.status === 'active';
}

/**
 * Check and potentially upgrade agent level based on performance
 * Called after commission processing to evaluate level upgrade
 * 
 * Upgrade conditions are based on:
 * 1. dailyPerformance (totalSales requirement in monthly record)
 * 2. recruitRequirement (number of referrals - parsed from string like "5人" or "8人")
 * 
 * Supports multi-level upgrade: if agent meets conditions for multiple levels,
 * they will be upgraded directly to the highest eligible level.
 */
export async function checkAndUpgradeLevel(userId: string): Promise<{
    upgraded: boolean;
    previousLevel?: string;
    newLevel?: string;
    levelsSkipped?: number;
}> {
    const profile = await getAgentProfile(userId);
    if (!profile || profile.status !== 'active') {
        return { upgraded: false };
    }

    // Get current level
    const currentLevel = await agentLevelRepository.findById(profile.levelId);
    if (!currentLevel) {
        return { upgraded: false };
    }

    // Get all enabled levels sorted by sortOrder
    const allLevels = await agentLevelRepository.findEnabled();
    const sortedLevels = allLevels.sort((a, b) => a.sortOrder - b.sortOrder);

    // Find current level index
    const currentIndex = sortedLevels.findIndex(l => l.id === currentLevel.id);
    if (currentIndex === -1 || currentIndex >= sortedLevels.length - 1) {
        // Already at highest level or level not found
        return { upgraded: false };
    }

    // Get agent's current month stats
    const { AgentRecordRepository } = await import('@/repositories/agent-record.repository');
    const { users } = await import('@/db/schema');
    const { sql } = await import('drizzle-orm');

    const agentRecordRepository = new AgentRecordRepository();
    const currentMonth = getCurrentMonth();
    const monthRecord = await agentRecordRepository.findByUserIdAndMonth(userId, currentMonth);

    // Get total referral count
    const [referralResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.referredBy, userId));
    const totalReferrals = referralResult?.count || 0;
    const currentSales = monthRecord?.totalSales || 0;

    // Parse recruit requirement (e.g., "5人" -> 5, "无" -> 0)
    const parseRecruitRequirement = (req: string): number => {
        if (!req || req === '无') return 0;
        const match = req.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    };

    // Check conditions for a specific level
    const meetsLevelConditions = (level: typeof sortedLevels[0]): boolean => {
        const requiredReferrals = parseRecruitRequirement(level.recruitRequirement);
        const requiredSales = level.dailyPerformance;

        const meetsReferralRequirement = requiredReferrals === 0 || totalReferrals >= requiredReferrals;
        const meetsSalesRequirement = requiredSales === 0 || currentSales >= requiredSales;

        return meetsReferralRequirement && meetsSalesRequirement;
    };

    // Find the highest level the agent qualifies for (multi-level upgrade support)
    let targetLevelIndex = currentIndex;
    for (let i = currentIndex + 1; i < sortedLevels.length; i++) {
        if (meetsLevelConditions(sortedLevels[i])) {
            targetLevelIndex = i;
        } else {
            // Stop at first level that doesn't meet conditions
            // (higher levels typically have stricter requirements)
            break;
        }
    }

    // Check if we found a higher level to upgrade to
    if (targetLevelIndex > currentIndex) {
        const newLevel = sortedLevels[targetLevelIndex];
        const levelsSkipped = targetLevelIndex - currentIndex - 1;

        // Upgrade!
        await agentProfileRepository.update(userId, { levelId: newLevel.id });

        // Log the auto upgrade
        await logLevelChange(
            userId,
            currentLevel.id,
            newLevel.id,
            'auto_upgrade',
            null,
            `自动升级: 推荐人数=${totalReferrals}, 月销售额=${currentSales}元`
        );

        console.log(`[Agent Upgrade] User ${userId} upgraded from "${currentLevel.name}" to "${newLevel.name}" (skipped ${levelsSkipped} levels)`);
        console.log(`[Agent Upgrade] Conditions met: referrals=${totalReferrals}, sales=${currentSales}`);

        return {
            upgraded: true,
            previousLevel: currentLevel.name,
            newLevel: newLevel.name,
            levelsSkipped,
        };
    }

    return { upgraded: false };
}

/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
