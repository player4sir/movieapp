/**
 * 修复历史代理绑定数据脚本
 * 
 * 问题：由于之前的bug，当上级代理未设置subAgentRate时，下级代理的parentAgentId未正确设置
 * 
 * 修复逻辑：
 * 1. 查找所有parentAgentId为空但agentCode不为空（已激活）的代理
 * 2. 通过users表的referredBy查找他们的推荐人
 * 3. 如果推荐人是代理商，则修复parentAgentId等字段
 */

import 'dotenv/config';
import { db } from '../src/db';
import { agentProfiles, users } from '../src/db/schema';
import { eq, isNull, and, isNotNull, sql } from 'drizzle-orm';

async function fixAgentBindings() {
    console.log('=== 开始修复代理商绑定数据 ===\n');

    // 1. 查找所有parentAgentId为空的已激活代理
    const orphanAgents = await db
        .select({
            userId: agentProfiles.userId,
            realName: agentProfiles.realName,
            agentCode: agentProfiles.agentCode,
            status: agentProfiles.status,
            parentAgentId: agentProfiles.parentAgentId,
            commissionRate: agentProfiles.commissionRate,
        })
        .from(agentProfiles)
        .where(
            and(
                isNull(agentProfiles.parentAgentId),
                eq(agentProfiles.status, 'active')
            )
        );

    console.log(`找到 ${orphanAgents.length} 个没有上级的代理\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const agent of orphanAgents) {
        // 2. 查找该代理用户的referredBy
        const [user] = await db
            .select({ referredBy: users.referredBy })
            .from(users)
            .where(eq(users.id, agent.userId));

        if (!user?.referredBy) {
            console.log(`[跳过] ${agent.realName || agent.userId}: 无推荐人记录`);
            skippedCount++;
            continue;
        }

        // 3. 查找推荐人是否是代理商
        const [parentAgent] = await db
            .select({
                userId: agentProfiles.userId,
                realName: agentProfiles.realName,
                status: agentProfiles.status,
                parentAgentId: agentProfiles.parentAgentId,
                level1AgentId: agentProfiles.level1AgentId,
                commissionRate: agentProfiles.commissionRate,
                subAgentRate: agentProfiles.subAgentRate,
            })
            .from(agentProfiles)
            .where(eq(agentProfiles.userId, user.referredBy));

        if (!parentAgent) {
            console.log(`[跳过] ${agent.realName || agent.userId}: 推荐人 ${user.referredBy} 不是代理商`);
            skippedCount++;
            continue;
        }

        if (parentAgent.status !== 'active') {
            console.log(`[跳过] ${agent.realName || agent.userId}: 上级代理 ${parentAgent.realName} 状态为 ${parentAgent.status}`);
            skippedCount++;
            continue;
        }

        // 4. 计算层级关系
        let level1AgentId: string | null = null;
        let level2AgentId: string | null = null;

        if (parentAgent.level1AgentId) {
            // 上级是三级代理
            level1AgentId = parentAgent.level1AgentId;
            level2AgentId = parentAgent.userId;
        } else if (parentAgent.parentAgentId) {
            // 上级是二级代理
            level1AgentId = parentAgent.parentAgentId;
            level2AgentId = parentAgent.userId;
        } else {
            // 上级是一级代理
            level1AgentId = parentAgent.userId;
            level2AgentId = null;
        }

        // 5. 计算佣金率
        let commissionRate = agent.commissionRate;
        if (parentAgent.subAgentRate > 0) {
            commissionRate = parentAgent.subAgentRate;
        } else {
            // 使用默认10%
            commissionRate = 1000;
        }

        // 6. 更新代理记录
        console.log(`[修复] ${agent.realName || agent.userId}:`);
        console.log(`  → 绑定上级: ${parentAgent.realName || parentAgent.userId}`);
        console.log(`  → parentAgentId: ${parentAgent.userId}`);
        console.log(`  → level1AgentId: ${level1AgentId}`);
        console.log(`  → level2AgentId: ${level2AgentId}`);
        console.log(`  → commissionRate: ${commissionRate / 100}%`);

        await db
            .update(agentProfiles)
            .set({
                parentAgentId: parentAgent.userId,
                level1AgentId,
                level2AgentId,
                commissionRate,
                updatedAt: new Date(),
            })
            .where(eq(agentProfiles.userId, agent.userId));

        fixedCount++;
        console.log('');
    }

    console.log('=== 修复完成 ===');
    console.log(`修复: ${fixedCount} 个代理`);
    console.log(`跳过: ${skippedCount} 个代理`);
}

// 运行脚本
fixAgentBindings()
    .then(() => {
        console.log('\n脚本执行完毕');
        process.exit(0);
    })
    .catch((err) => {
        console.error('脚本执行失败:', err);
        process.exit(1);
    });
