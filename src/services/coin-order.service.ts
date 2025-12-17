import {
    CoinOrderRepository,
    OrderListResult,
} from '@/repositories';
import { CoinOrder, PaymentType } from '@/db/schema';
import { addCoins } from './coin.service';
import { getConfig } from './config.service';

export const COIN_ORDER_ERRORS = {
    ORDER_NOT_FOUND: { code: 'ORDER_NOT_FOUND', message: '订单不存在' },
    ORDER_ALREADY_PROCESSED: { code: 'ORDER_ALREADY_PROCESSED', message: '订单已处理' },
    INVALID_AMOUNT: { code: 'INVALID_AMOUNT', message: '充值金额无效' },
    INVALID_PACKAGE: { code: 'INVALID_PACKAGE', message: '无效的充值套餐' },
    PENDING_ORDER_EXISTS: { code: 'PENDING_ORDER_EXISTS', message: '您有未完成的订单，请先完成或取消' },
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

// P2 Fix: Improved order number generation using timestamp + random for better uniqueness
function generateOrderNo(): string {
    const now = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `C${now}${random}`;  // e.g., C1702876543210ABC123
}

export async function createCoinOrder(input: CreateCoinOrderInput): Promise<CoinOrder> {
    const { userId, amount, price, paymentType } = input;

    if (amount <= 0 || price <= 0) {
        throw { ...COIN_ORDER_ERRORS.INVALID_AMOUNT };
    }

    // P1 Fix: Validate against configured recharge packages
    const packageConfig = await getConfig('recharge_packages');
    const packages = Array.isArray(packageConfig.value) ? packageConfig.value : [];
    const validPackage = packages.find(
        (pkg: { coins: number; price: number }) => pkg.coins === amount && pkg.price === price
    );
    if (!validPackage) {
        throw { ...COIN_ORDER_ERRORS.INVALID_PACKAGE };
    }

    // P1 Fix: Check for existing pending orders (rate limiting)
    const hasPending = await coinOrderRepository.hasPendingOrder(userId);
    if (hasPending) {
        throw { ...COIN_ORDER_ERRORS.PENDING_ORDER_EXISTS };
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

    // Note: We still do initial check for better error messages,
    // but the real protection is the conditional update below
    if (order.status !== 'pending' && order.status !== 'paid') {
        throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
    }

    // Use conditional update to prevent race condition:
    // Only update if status is still 'pending' or 'paid'
    const updatedOrder = await coinOrderRepository.updateWithCondition(
        orderId,
        { status: ['pending', 'paid'] },  // Condition: only if status is pending or paid
        {
            status: 'approved',
            reviewedBy: adminId,
            reviewedAt: new Date(),
        }
    );

    if (!updatedOrder) {
        // Another admin already processed this order
        throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
    }

    // Add coins to user - this is safe because we only reach here if update succeeded
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

    if (order.status !== 'pending' && order.status !== 'paid') {
        throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
    }

    // Use conditional update to prevent race condition
    const updatedOrder = await coinOrderRepository.updateWithCondition(
        orderId,
        { status: ['pending', 'paid'] },
        {
            status: 'rejected',
            reviewedBy: adminId,
            reviewedAt: new Date(),
            rejectReason: reason,
        }
    );

    if (!updatedOrder) {
        throw { ...COIN_ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
    }

    return updatedOrder;
}
