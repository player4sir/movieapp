
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { AgentProfileRepository } from '@/repositories';
import { z } from 'zod';

const agentProfileRepository = new AgentProfileRepository();

const updatePaymentInfoSchema = z.object({
    paymentMethod: z.enum(['alipay', 'wechat', 'bank', 'kangxun']),
    paymentAccount: z.string().min(1, 'Payment account is required'),
    realName: z.string().min(1, 'Real name is required'),
});

export async function PUT(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { user } = authResult;

    try {
        const body = await req.json();
        const validation = updatePaymentInfoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validation.error.format() },
                { status: 400 }
            );
        }

        const { paymentMethod, paymentAccount, realName } = validation.data;

        // Verify agent profile exists
        const profile = await agentProfileRepository.findByUserId(user.id);
        if (!profile) {
            return NextResponse.json(
                { error: 'Agent profile not found' },
                { status: 404 }
            );
        }

        const updatedProfile = await agentProfileRepository.updatePaymentInfo(user.id, {
            paymentMethod,
            paymentAccount,
            realName,
        });

        return NextResponse.json({ profile: updatedProfile });
    } catch (error) {
        console.error('Failed to update payment info:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
