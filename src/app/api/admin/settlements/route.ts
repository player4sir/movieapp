
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { AgentProfileRepository, SettlementRecordRepository } from '@/repositories';
import { z } from 'zod';

const agentProfileRepository = new AgentProfileRepository();
const settlementRecordRepository = new SettlementRecordRepository();

const settleSchema = z.object({
    userId: z.string().min(1),
    amount: z.number().int().positive(),
    transactionId: z.string().optional(),
    note: z.string().optional(),
});

// GET: List agents with balance > 0 (candidates for settlement)
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    // requireAdmin returns NextResponse on error (unauth/forbidden) or object on success
    if (isAuthError(authResult)) {
        return authResult;
    }

    // No need to check role again, requireAdmin did it.

    try {
        // Fetch all active agents
        const { data: profiles } = await agentProfileRepository.list({ status: 'active' } as Record<string, string>);

        // Filter those with balance > 0
        interface AgentProfile {
            userId: string;
            realName: string;
            contact: string;
            level: unknown;
            balance: number;
            totalIncome: number;
            paymentMethod: string;
            paymentAccount: string;
        }
        const settlableAgents = (profiles as AgentProfile[]).filter((p) => p.balance > 0).map((p) => ({
            userId: p.userId,
            realName: p.realName,
            contact: p.contact,
            level: p.level,
            balance: p.balance,
            totalIncome: p.totalIncome,
            paymentMethod: p.paymentMethod,
            paymentAccount: p.paymentAccount,
        }));

        return NextResponse.json({ agents: settlableAgents });
    } catch (error) {
        console.error('Failed to fetch settlable agents:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Execute settlement
export async function POST(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { user: admin } = authResult;

    try {
        const body = await req.json();
        const validation = settleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.format() },
                { status: 400 }
            );
        }

        const { userId, amount, transactionId, note } = validation.data;

        // 1. Get Agent Profile to check balance and get payment snapshot
        const profile = await agentProfileRepository.findByUserId(userId);
        if (!profile) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        if (profile.balance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // 2. Create Settlement Record
        // Explicit cast for method to satisfy enum type if needed, or ensure fallback is valid enum
        // Schema enum: 'alipay' | 'wechat' | 'bank' | 'kangxun'
        // If profile has no method, we can't settle or must default to valid enum.
        // Logic: if not set, reject settlement or default to 'bank' + note "MANUAL".

        const validMethods = ['alipay', 'wechat', 'bank', 'kangxun'];
        const method = profile.paymentMethod as 'alipay' | 'wechat' | 'bank' | 'kangxun';
        if (!method || !validMethods.includes(method)) {
            // This creates a risk if we force a value. BUT we filtered list by existing payment info.
            // Let's assume bank if invalid? Or return error?
            // Safer to return error if invalid.
            return NextResponse.json({ error: 'Invalid or missing payment method on agent profile' }, { status: 400 });
        }

        const record = await settlementRecordRepository.create({
            id: crypto.randomUUID(),
            userId,
            amount,
            method,
            account: profile.paymentAccount || 'Unknown',
            transactionId: transactionId || '',
            note: note || '',
            settledBy: admin.id,
        });

        // 3. Deduct Balance (Atomic update preferred)
        await agentProfileRepository.deductBalance(userId, amount);

        return NextResponse.json({ success: true, record });

    } catch (error) {
        console.error('Failed to settle:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
