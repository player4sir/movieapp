/**
 * Agent Batch Operations API Route
 * POST: Batch settle agent records
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

/**
 * POST /api/admin/agents/batch
 * Batch operations on agent records
 */
export async function POST(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const body = await request.json();
        const { operation, recordIds, month } = body;

        if (!operation) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '请指定操作类型' },
                { status: 400 }
            );
        }

        let affected = 0;

        switch (operation) {
            case 'settle': {
                // Settle specific records or all pending records for a month
                if (recordIds && Array.isArray(recordIds) && recordIds.length > 0) {
                    // Settle specific records
                    for (const id of recordIds) {
                        try {
                            await agentService.settleAgentRecord(id);
                            affected++;
                        } catch (e) {
                            console.error(`Failed to settle record ${id}:`, e);
                        }
                    }
                } else if (month) {
                    // Settle all pending records for the month
                    const records = await agentService.listAgentRecords({
                        month,
                        status: 'pending',
                        pageSize: 1000,
                    });

                    for (const record of records.data) {
                        try {
                            await agentService.settleAgentRecord(record.id);
                            affected++;
                        } catch (e) {
                            console.error(`Failed to settle record ${record.id}:`, e);
                        }
                    }
                } else {
                    return NextResponse.json(
                        { code: 'VALIDATION_ERROR', message: '请指定记录ID或月份' },
                        { status: 400 }
                    );
                }
                break;
            }

            default:
                return NextResponse.json(
                    { code: 'VALIDATION_ERROR', message: '不支持的操作类型' },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            affected,
            message: `成功处理 ${affected} 条记录`,
        });
    } catch (error) {
        console.error('Batch operation error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '批量操作失败' },
            { status: 500 }
        );
    }
}
