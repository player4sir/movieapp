/**
 * Agent Commission Report Service
 * Handles agent level management and agent record operations for commission tracking.
 */

import {
    AgentLevelRepository,
    AgentRecordRepository,
    CreateAgentLevelInput,
    UpdateAgentLevelInput,
    CreateAgentRecordInput,
    UpdateAgentRecordInput,
    AgentRecordListParams,
    AgentRecordListResult,
    AgentReportSummary,
} from '@/repositories';
import { AgentLevel, AgentRecord } from '@/db/schema';

// ============================================
// Error Definitions
// ============================================

export const AGENT_ERRORS = {
    LEVEL_NOT_FOUND: {
        code: 'LEVEL_NOT_FOUND',
        message: '代理等级不存在',
    },
    RECORD_NOT_FOUND: {
        code: 'RECORD_NOT_FOUND',
        message: '代理记录不存在',
    },
    LEVEL_IN_USE: {
        code: 'LEVEL_IN_USE',
        message: '该等级正在使用中，无法删除',
    },
} as const;

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Calculate commission and bonus based on level configuration
 */
function calculateEarnings(
    totalSales: number,
    commissionRate: number,
    hasBonus: boolean,
    bonusRate: number
): { commissionAmount: number; bonusAmount: number; totalEarnings: number } {
    // totalSales is in yuan, convert to fen for calculation
    const salesInFen = totalSales * 100;

    // commissionRate is in basis points (1000 = 10%)
    const commissionAmount = Math.floor(salesInFen * commissionRate / 10000);

    // bonusRate is also in basis points
    const bonusAmount = hasBonus ? Math.floor(salesInFen * bonusRate / 10000) : 0;

    const totalEarnings = commissionAmount + bonusAmount;

    return { commissionAmount, bonusAmount, totalEarnings };
}

// ============================================
// Repository Instances
// ============================================

const agentLevelRepository = new AgentLevelRepository();
const agentRecordRepository = new AgentRecordRepository();

// ============================================
// Agent Level Operations
// ============================================

/**
 * Get all agent levels
 */
export async function getAgentLevels(): Promise<AgentLevel[]> {
    return agentLevelRepository.findAll();
}

/**
 * Get enabled agent levels only
 */
export async function getEnabledAgentLevels(): Promise<AgentLevel[]> {
    return agentLevelRepository.findEnabled();
}

/**
 * Get agent level by ID
 */
export async function getAgentLevelById(id: string): Promise<AgentLevel | null> {
    return agentLevelRepository.findById(id);
}

/**
 * Create a new agent level
 */
export async function createAgentLevel(
    input: Omit<CreateAgentLevelInput, 'id'>
): Promise<AgentLevel> {
    return agentLevelRepository.create({
        id: generateId(),
        ...input,
    });
}

/**
 * Update an agent level
 */
export async function updateAgentLevel(
    id: string,
    input: UpdateAgentLevelInput
): Promise<AgentLevel> {
    const existingLevel = await agentLevelRepository.findById(id);
    if (!existingLevel) {
        throw { ...AGENT_ERRORS.LEVEL_NOT_FOUND };
    }

    const updated = await agentLevelRepository.update(id, input);
    if (!updated) {
        throw { ...AGENT_ERRORS.LEVEL_NOT_FOUND };
    }

    return updated;
}

/**
 * Delete an agent level
 */
export async function deleteAgentLevel(id: string): Promise<void> {
    const existingLevel = await agentLevelRepository.findById(id);
    if (!existingLevel) {
        throw { ...AGENT_ERRORS.LEVEL_NOT_FOUND };
    }

    // Check if level is in use
    const records = await agentRecordRepository.list({ levelId: id, pageSize: 1 });
    if (records.pagination.total > 0) {
        throw { ...AGENT_ERRORS.LEVEL_IN_USE };
    }

    await agentLevelRepository.delete(id);
}

/**
 * Initialize default agent levels based on the provided table
 */
export async function initializeDefaultLevels(): Promise<AgentLevel[]> {
    const existingLevels = await agentLevelRepository.findAll();
    if (existingLevels.length > 0) {
        return existingLevels;
    }

    const defaultLevels = [
        { name: '新人', sortOrder: 0, recruitRequirement: '邀请数量5人', dailyPerformance: 0, commissionRate: 1000, hasBonus: false, bonusRate: 0 },
        { name: '一级', sortOrder: 1, recruitRequirement: '5人', dailyPerformance: 1500, commissionRate: 1100, hasBonus: false, bonusRate: 0 },
        { name: '二级', sortOrder: 2, recruitRequirement: '8人', dailyPerformance: 3000, commissionRate: 1200, hasBonus: false, bonusRate: 0 },
        { name: '三级', sortOrder: 3, recruitRequirement: '无', dailyPerformance: 20000, commissionRate: 1300, hasBonus: false, bonusRate: 0 },
        { name: '大咖一极', sortOrder: 4, recruitRequirement: '无', dailyPerformance: 80000, commissionRate: 1300, hasBonus: true, bonusRate: 1000 },
        { name: '大咖二极', sortOrder: 5, recruitRequirement: '无', dailyPerformance: 150000, commissionRate: 1400, hasBonus: true, bonusRate: 1500 },
        { name: '至尊大咖', sortOrder: 6, recruitRequirement: '无', dailyPerformance: 300000, commissionRate: 1500, hasBonus: true, bonusRate: 3000 },
    ];

    const createdLevels: AgentLevel[] = [];
    for (const level of defaultLevels) {
        const created = await createAgentLevel(level);
        createdLevels.push(created);
    }

    return createdLevels;
}

// ============================================
// Agent Record Operations
// ============================================

/**
 * List agent records with filters
 */
export async function listAgentRecords(
    params: AgentRecordListParams
): Promise<AgentRecordListResult> {
    return agentRecordRepository.list(params);
}

/**
 * Get agent record by ID
 */
export async function getAgentRecordById(id: string): Promise<(AgentRecord & { level: AgentLevel }) | null> {
    return agentRecordRepository.findById(id);
}

/**
 * Create a new agent record with auto-calculated earnings
 */
export async function createAgentRecord(
    input: Omit<CreateAgentRecordInput, 'id' | 'commissionAmount' | 'bonusAmount' | 'totalEarnings'>
): Promise<AgentRecord> {
    // Get the level to calculate commission
    const level = await agentLevelRepository.findById(input.levelId);
    if (!level) {
        throw { ...AGENT_ERRORS.LEVEL_NOT_FOUND };
    }

    const totalSales = input.totalSales ?? 0;
    const { commissionAmount, bonusAmount, totalEarnings } = calculateEarnings(
        totalSales,
        level.commissionRate,
        level.hasBonus,
        level.bonusRate
    );

    return agentRecordRepository.create({
        id: generateId(),
        ...input,
        commissionAmount,
        bonusAmount,
        totalEarnings,
    });
}

/**
 * Update an agent record with auto-recalculated earnings if sales changed
 */
export async function updateAgentRecord(
    id: string,
    input: UpdateAgentRecordInput
): Promise<AgentRecord> {
    const existingRecord = await agentRecordRepository.findById(id);
    if (!existingRecord) {
        throw { ...AGENT_ERRORS.RECORD_NOT_FOUND };
    }

    // If totalSales or levelId changed, recalculate earnings
    if (input.totalSales !== undefined || input.levelId !== undefined) {
        const levelId = input.levelId ?? existingRecord.levelId;
        const level = await agentLevelRepository.findById(levelId);
        if (!level) {
            throw { ...AGENT_ERRORS.LEVEL_NOT_FOUND };
        }

        const totalSales = input.totalSales ?? existingRecord.totalSales;
        const { commissionAmount, bonusAmount, totalEarnings } = calculateEarnings(
            totalSales,
            level.commissionRate,
            level.hasBonus,
            level.bonusRate
        );

        input.commissionAmount = commissionAmount;
        input.bonusAmount = bonusAmount;
        input.totalEarnings = totalEarnings;
    }

    const updated = await agentRecordRepository.update(id, input);
    if (!updated) {
        throw { ...AGENT_ERRORS.RECORD_NOT_FOUND };
    }

    return updated;
}

/**
 * Delete an agent record
 */
export async function deleteAgentRecord(id: string): Promise<void> {
    const existingRecord = await agentRecordRepository.findById(id);
    if (!existingRecord) {
        throw { ...AGENT_ERRORS.RECORD_NOT_FOUND };
    }

    await agentRecordRepository.delete(id);
}

/**
 * Mark agent record as settled
 */
export async function settleAgentRecord(id: string): Promise<AgentRecord> {
    return updateAgentRecord(id, { status: 'settled' });
}

// ============================================
// Report Operations
// ============================================

/**
 * Get report summary for a specific month
 */
export async function getAgentReportSummary(month: string): Promise<AgentReportSummary> {
    return agentRecordRepository.getReportSummary(month);
}

/**
 * Get list of months that have records
 */
export async function getAvailableMonths(): Promise<string[]> {
    return agentRecordRepository.getAvailableMonths();
}

/**
 * Get current month string in YYYY-MM format
 */
export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
/**
 * Process order commission
 * 1. Find referrer
 * 2. Check if referrer is active agent
 * 3. Calculate commission + bonus using unified formula
 * 4. Update Agent Profile (Income & Balance) - includes commission + bonus
 * 5. Update Agent Record (Daily/Month stats)
 */
export async function processOrderCommission(
    userId: string,
    orderAmount: number, // in cents
    orderType: 'membership' | 'coin',
    explicitAgentId?: string | null
): Promise<void> {
    // Dynamic imports to avoid circular dependencies
    const { getAgentProfile } = await import('./agent-profile.service');
    const { UserRepository } = await import('@/repositories/user.repository');
    const { AgentProfileRepository } = await import('@/repositories/agent-profile.repository');

    const userRepository = new UserRepository();
    const agentProfileRepository = new AgentProfileRepository();

    // 1. Identify Referrer (Agent)
    let referrerId: string | null | undefined = explicitAgentId;

    if (!referrerId) {
        const user = await userRepository.findById(userId);
        referrerId = user?.referredBy;
    }

    if (!referrerId) {
        return; // No referrer, no commission
    }

    // Prevent self-commission
    if (referrerId === userId) {
        return;
    }

    // 2. Check Agent Status
    const agentProfile = await getAgentProfile(referrerId);
    if (!agentProfile || agentProfile.status !== 'active') {
        return; // Referrer is not an active agent
    }

    // 3. Get Level Configuration
    const level = await getAgentLevelById(agentProfile.levelId);
    if (!level) return;

    // 4. Calculate Commission + Bonus using unified formula
    // orderAmount is in cents (fen), convert to yuan for calculateEarnings
    const orderAmountYuan = orderAmount / 100;
    const { commissionAmount, bonusAmount, totalEarnings } = calculateEarnings(
        orderAmountYuan,
        level.commissionRate,
        level.hasBonus,
        level.bonusRate
    );

    if (totalEarnings <= 0) return;

    // 5. Update Profile Income & Balance (includes BOTH commission AND bonus)
    await agentProfileRepository.addIncome(referrerId, totalEarnings);

    // 6. Update/Create Monthly Record
    const month = getCurrentMonth();
    const existingRecord = await agentRecordRepository.findByUserIdAndMonth(referrerId, month);

    if (existingRecord) {
        // Accumulate sales for the month
        // Note: agentRecords stores totalSales in yuan
        const newTotalSales = existingRecord.totalSales + Math.floor(orderAmountYuan);

        // updateAgentRecord will recalculate earnings based on newTotalSales and current level
        await updateAgentRecord(existingRecord.id, {
            totalSales: newTotalSales,
        });
    } else {
        // Create new record for this month
        await createAgentRecord({
            agentName: agentProfile.realName || 'Agent',
            agentContact: agentProfile.contact || '',
            levelId: agentProfile.levelId,
            month,
            recruitCount: 0,
            dailySales: 0,
            totalSales: Math.floor(orderAmountYuan),
            userId: referrerId,
            status: 'pending',
        });
    }

    console.log(`[Commission] Agent ${referrerId}: order ¥${orderAmountYuan}, commission ¥${commissionAmount / 100}, bonus ¥${bonusAmount / 100}, total ¥${totalEarnings / 100}`);

    // 7. Check for level upgrade after commission processing
    try {
        const { checkAndUpgradeLevel } = await import('./agent-profile.service');
        await checkAndUpgradeLevel(referrerId);
    } catch (error) {
        console.error('Failed to check agent level upgrade:', error);
    }
}

/**
 * Track new recruit for agent
 */
export async function trackRecruit(inviterId: string): Promise<void> {
    const { getAgentProfile } = await import('./agent-profile.service');
    // Check if inviter is active agent
    const agentProfile = await getAgentProfile(inviterId);
    if (!agentProfile || agentProfile.status !== 'active') return;

    const month = getCurrentMonth();
    const existingRecord = await agentRecordRepository.findByUserIdAndMonth(inviterId, month);

    if (existingRecord) {
        await agentRecordRepository.update(existingRecord.id, {
            recruitCount: existingRecord.recruitCount + 1
        });
    } else {
        // Create new record
        await createAgentRecord({
            agentName: agentProfile.realName || 'Agent',
            agentContact: agentProfile.contact || '',
            levelId: agentProfile.levelId,
            month,
            recruitCount: 1,
            dailySales: 0,
            totalSales: 0,
            userId: inviterId,
            status: 'pending',
        });
    }
}
