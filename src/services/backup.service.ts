import { db } from '@/db';
import { allTables } from '@/db/schema';
import type { PgTable } from 'drizzle-orm/pg-core';

// Define the order for deletion (Reverse Dependency Order)
// We must delete children before parents to avoid FK constraint violations
const DELETION_ORDER = [
    // Analytics/High Level Relation
    'adClicks',
    'adImpressions',
    'adSlotAssignments',
    'membershipAdjustLogs',
    'membershipOrders',
    'coinOrders',
    'coinTransactions',
    'contentAccess',
    'userCheckins',
    'userSessions',
    'watchHistory',
    'favorites',
    'userCoinBalances',

    // Core Entities with dependencies
    'users',       // Depends on userGroups
    'userGroups',

    // Standalone / Parent Entities
    'ads',
    'adSlots',
    'membershipPlans',
    'paymentQRCodes',
    'coinConfigs',
    'siteSettings',
    'videoSources',
];

// Define the order for insertion (Dependency Order)
// Parents must exist before children
const INSERTION_ORDER = [
    // Standalone / Parent Entities
    'userGroups',
    'videoSources',
    'siteSettings',
    'coinConfigs',
    'paymentQRCodes',
    'membershipPlans',
    'ads',
    'adSlots',

    // Core Entities
    'users',       // Depends on userGroups
    'userCoinBalances', // Depends on users

    // Dependent Entities
    'favorites',
    'watchHistory',
    'userSessions',
    'userCheckins',
    'contentAccess',
    'coinTransactions',
    'coinOrders',
    'membershipOrders',
    'membershipAdjustLogs',
    'adSlotAssignments',
    'adImpressions',
    'adClicks',
];

interface BackupData {
    version: string;
    timestamp: string;
    data: Record<string, unknown[]>;
}

export class BackupService {
    /**
     * Export all data from the database
     */
    async exportData(): Promise<BackupData> {
        const data: Record<string, unknown[]> = {};

        // Fetch all data from all tables
        for (const [key, table] of Object.entries(allTables)) {
            if (key === 'userRoleEnum') continue; // Skip enums

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await db.select().from(table as unknown as PgTable<any>);
                data[key] = result;
            } catch (error) {
                console.warn(`Failed to export table ${key}:`, error);
                // Continue to verify if it is just an empty table or non-selectable
            }
        }

        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data,
        };
    }

    /**
     * Import data into the database
     * WARNING: This will WIPE existing data!
     */
    async importData(backup: BackupData): Promise<{ success: boolean; message: string }> {
        if (!backup.data || typeof backup.data !== 'object') {
            throw new Error('Invalid backup format');
        }

        // Execute in a transaction to ensure atomicity
        return await db.transaction(async (tx) => {
            try {
                // 1. Delete existing data in reverse dependency order
                for (const tableName of DELETION_ORDER) {
                    const table = allTables[tableName as keyof typeof allTables];
                    if (table && tableName !== 'userRoleEnum') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await tx.delete(table as unknown as PgTable<any>);
                    }
                }

                // 2. Insert new data in dependency order
                let insertedCount = 0;
                for (const tableName of INSERTION_ORDER) {
                    const table = allTables[tableName as keyof typeof allTables];
                    const rows = backup.data[tableName];

                    if (table && rows && Array.isArray(rows) && rows.length > 0) {
                        // Insert in chunks to avoid query parameter limits if many rows
                        // Drizzle might handle this, but let's be safe with reasonable chunks if needed.
                        // For now, simpler approach:

                        // We need to handle potential data transformations if schema changed, 
                        // but for migration matching schema, direct insert should work.
                        // We also need to sanitize dates if they are strings in JSON.
                        const sanitizedRows = rows.map(row => {
                            // Cast to Record for spread operation
                            const newRow = { ...(row as Record<string, unknown>) };
                            // Simple heuristic to convert ISO date strings back to Date objects
                            for (const key in newRow) {
                                if (typeof newRow[key] === 'string' &&
                                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(newRow[key] as string)) {
                                    newRow[key] = new Date(newRow[key] as string);
                                }
                            }
                            return newRow;
                        });

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await tx.insert(table as unknown as PgTable<any>).values(sanitizedRows);
                        insertedCount += rows.length;
                    }
                }

                return { success: true, message: `Successfully restored ${insertedCount} records` };
            } catch (error) {
                console.error('Import failed:', error);
                // Transaction will auto-rollback on error
                throw new Error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}

export const backupService = new BackupService();
