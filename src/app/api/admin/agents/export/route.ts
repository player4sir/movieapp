/**
 * Agent Report Export API Route
 * GET: Export agent records as CSV/Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

/**
 * GET /api/admin/agents/export
 * Export agent records for a specific month as CSV
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month') ?? agentService.getCurrentMonth();

        // Get all records for the month
        const result = await agentService.listAgentRecords({
            month,
            pageSize: 1000, // Get all records
        });

        // Build CSV content
        const headers = [
            '代理商名称',
            '联系方式',
            '等级',
            '月份',
            '招代理数量',
            '每天业绩(元)',
            '月总业绩(元)',
            '佣金(元)',
            '分红(元)',
            '总收入(元)',
            '状态',
            '备注',
        ];

        const rows = result.data.map(record => [
            record.agentName,
            record.agentContact || '',
            record.level?.name || '',
            record.month,
            record.recruitCount.toString(),
            record.dailySales.toString(),
            record.totalSales.toString(),
            (record.commissionAmount / 100).toFixed(2),
            (record.bonusAmount / 100).toFixed(2),
            (record.totalEarnings / 100).toFixed(2),
            record.status === 'settled' ? '已结算' : '待结算',
            record.note || '',
        ]);

        // Add BOM for Excel to recognize UTF-8
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        // Return as downloadable file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="agents_${month}.csv"`,
            },
        });
    } catch (error) {
        console.error('Export agent records error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '导出失败' },
            { status: 500 }
        );
    }
}
