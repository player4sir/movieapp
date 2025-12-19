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
 */
export async function applyForAgent(
    userId: string,
    data: { realName: string; contact: string }
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

    return agentProfileRepository.create({
        userId,
        levelId: defaultLevel.id,
        status: 'pending',
        realName: data.realName,
        contact: data.contact,
        totalIncome: 0,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

/**
 * Approve Agent Application (Admin)
 * Generates unique agentCode on approval
 */
export async function approveAgent(userId: string): Promise<AgentProfile> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    // Generate unique agent code if not exists
    let agentCode = profile.agentCode;
    if (!agentCode) {
        agentCode = await generateAgentCode();
    }

    return agentProfileRepository.update(userId, {
        status: 'active',
        agentCode
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
 * Update Agent Profile Details (Admin)
 */
export async function updateAgentProfile(
    userId: string,
    data: Partial<Pick<AgentProfile, 'realName' | 'contact' | 'levelId' | 'status'>>
): Promise<AgentProfile> {
    const profile = await agentProfileRepository.findByUserId(userId);
    if (!profile) throw { ...AGENT_PROFILE_ERRORS.PROFILE_NOT_FOUND };

    return agentProfileRepository.update(userId, data) as Promise<AgentProfile>;
}

/**
 * Check if user is an active agent
 */
export async function isUserActiveAgent(userId: string): Promise<boolean> {
    const profile = await getAgentProfile(userId);
    return profile?.status === 'active';
}
