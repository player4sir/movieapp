import {
    CoinOrderRepository,
    OrderListResult,
} from '@/repositories';
import { CoinOrder, PaymentType } from '@/db/schema';
import { addCoins } from './coin.service';

export const COIN_ORDER_ERRORS = {
    ORDER_NOT_FOUND: { code: 'ORDER_NOT_FOUND', message: '订单不存在' },
    ORDER_ALREADY_PROCESSED: { code: 'ORDER_ALREADY_PROCESSED', message: '订单已处理' },
    INVALID_AMOUNT: { code: 'INVALID_AMOUNT', message: '充值金额无效' },
} as const;

const coinOrderRepository = new CoinOrderRepository();

export interface CreateCoinOrderInput {
    userId: string;
    amount: number;
    price: number; // In cents
    paymentType?: PaymentType;
}

export interface SubmitProofInput {
    screenshot?: string;
    transactionNote?: string;
}

function generateOrderNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `C${dateStr}${sequence}`;
}

export async function createCoinOrder(input: CreateCoinOrderInput): Promise<CoinOrder> {
    const { userId, amount, price, paymentType } = input;

    if (amount <= 0 || price <= 0) {
        throw { ...COIN_ORDER_ERRORS.INVALID_AMOUNT };
    }

    const remarkCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    const order = await coinOrderRepository.create({
        id: crypto.randomUUID(),
        orderNo: generateOrderNo(),
        userId,
        amount,
        price,
        paymentType,
        status: 'pending',
        remarkCode,
        updatedAt: new Date(),
    });

    return order;
}

export async function submitCoinOrderProof(
    orderId: string,
    userId: string,
    input: SubmitProofInput
): Promise<CoinOrder> {
    const order = await coinOrderRepository.findById(orderId);
    if (!order || order.userId !== userId) {
        throw { ...COIN_ORDER_ERRORS.ORDER_NOT_FOUND };
    }

    if (order.status !== 'pending') {
        throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
    }

    const updatedOrder = await coinOrderRepository.update(orderId, {
        status: 'paid',
        paymentScreenshot: input.screenshot,
        transactionNote: input.transactionNote,
    });

    if (!updatedOrder) {
        throw { ...COIN_ORDER_ERRORS.ORDER_NOT_FOUND };
    }

    return updatedOrder;
}

export async function getCoinOrders(
    userId: string,
    page: number = 1,
    pageSize: number = 20
): Promise<OrderListResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return coinOrderRepository.list({
        userId,
        page,
        pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function approveCoinOrder(orderId: string, adminId: string) {
    const order = await coinOrderRepository.findById(orderId);
    if (!order) throw { ...COIN_ORDER_ERRORS.ORDER_NOT_FOUND };

    if (order.status !== 'pending') throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };

    const updatedOrder = await coinOrderRepository.update(orderId, {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
    });

    // Add coins to user
    await addCoins(
        order.userId,
        order.amount,
        'recharge',
        `充值 ${order.amount} 金币`,
        { orderId: order.id, orderNo: order.orderNo }
    );

    return updatedOrder;
}

export async function rejectCoinOrder(orderId: string, adminId: string, reason: string) {
    const order = await coinOrderRepository.findById(orderId);
    if (!order) throw { ...COIN_ORDER_ERRORS.ORDER_NOT_FOUND };

    if (order.status !== 'pending') throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };

    return coinOrderRepository.update(orderId, {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: reason,
    });
}
