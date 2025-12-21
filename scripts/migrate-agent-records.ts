/**
 * Migration Script: Sync Agent Records with Profile Income
 * 
 * Purpose: Fix historical data inconsistency where agentRecords.totalEarnings
 * was calculated based on level config, not actual income.
 * 
 * Strategy: For each agent, set their current month's agentRecords.totalEarnings
 * to match their agentProfiles.totalIncome.
 * 
 * Run with: npx tsx scripts/migrate-agent-records.ts
 */

import 'dotenv/config';
import { db } from '../src/db';
import { agentProfiles, agentRecords } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function migrateAgentRecords() {
    console.log('Starting agent records migration...\n');

    try {
        // 1. Get all agent profiles
        const profiles = await db.query.agentProfiles.findMany({
            where: eq(agentProfiles.status, 'active'),
        });

        console.log(`Found ${profiles.length} active agents\n`);

        // 2. Get current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        console.log(`Current month: ${currentMonth}\n`);

        let updated = 0;
        let skipped = 0;
        let created = 0;

        for (const profile of profiles) {
            // 3. Find the agent's current month record
            const record = await db.query.agentRecords.findFirst({
                where: eq(agentRecords.userId, profile.userId),
            });

            if (!record) {
                // No record exists - skip if no income
                if (profile.totalIncome === 0) {
                    skipped++;
                    continue;
                }

                // Create a record with the actual income
                await db.insert(agentRecords).values({
                    id: crypto.randomUUID(),
                    agentName: profile.realName || 'Agent',
                    agentContact: profile.contact || '',
                    levelId: profile.levelId,
                    month: currentMonth,
                    recruitCount: 0,
                    dailySales: 0,
                    totalSales: 0,
                    commissionAmount: profile.totalIncome,
                    bonusAmount: 0,
                    totalEarnings: profile.totalIncome,
                    userId: profile.userId,
                    status: 'pending',
                    note: 'Migrated from profile totalIncome',
                    updatedAt: new Date(),
                });

                console.log(`[CREATED] ${profile.realName}: earnings = ¥${(profile.totalIncome / 100).toFixed(2)}`);
                created++;
                continue;
            }

            // 4. Compare and update if different
            const profileIncome = profile.totalIncome;
            const recordEarnings = record.totalEarnings;

            if (profileIncome !== recordEarnings) {
                await db.update(agentRecords)
                    .set({
                        totalEarnings: profileIncome,
                        commissionAmount: profileIncome,
                        note: `Migrated: was ¥${(recordEarnings / 100).toFixed(2)}, now ¥${(profileIncome / 100).toFixed(2)}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(agentRecords.id, record.id));

                console.log(`[UPDATED] ${profile.realName}: ¥${(recordEarnings / 100).toFixed(2)} → ¥${(profileIncome / 100).toFixed(2)}`);
                updated++;
            } else {
                skipped++;
            }
        }

        console.log('\n========== Migration Complete ==========');
        console.log(`Updated: ${updated}`);
        console.log(`Created: ${created}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Total:   ${profiles.length}`);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

migrateAgentRecords();
