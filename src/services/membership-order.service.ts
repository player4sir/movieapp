/**
 * Membership Order Service
 * Handles membership order creation, payment proof submission, and admin review operations.
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.5, 9.1
 */

import {
  MembershipOrderRepository,
  MembershipPlanRepository,
  PaymentQRCodeRepository,
  OrderListParams,
  OrderListResult,
} from '@/repositories';
import { MembershipOrder, PaymentQRCode, PaymentType } from '@/db/schema';
import { activateMembership, MEMBERSHIP_ERRORS } from './membership.service';

// ============================================
// Error Definitions
// ============================================

export const ORDER_ERRORS = {
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    message: '订单不存在',
  },
  DUPLICATE_PENDING_ORDER: {
    code: 'DUPLICATE_PENDING_ORDER',
    message: '您已有待审核的相同订单',
  },
  ORDER_ALREADY_PROCESSED: {
    code: 'ORDER_ALREADY_PROCESSED',
    message: '订单已处理',
  },
  INVALID_ORDER_STATUS: {
    code: 'INVALID_ORDER_STATUS',
    message: '无效的订单状态',
  },
  PLAN_NOT_FOUND: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND,
  PLAN_DISABLED: MEMBERSHIP_ERRORS.PLAN_DISABLED,
} as const;

// ============================================
// Types
// ============================================

export interface CreateOrderInput {
  userId: string;
  planId: string;
  paymentType?: PaymentType;
}

export interface SubmitPaymentProofInput {
  screenshot?: string;
  transactionNote?: string;
}

export interface ApproveOrderResult {
  order: MembershipOrder;
  membershipActivated: boolean;
}

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique order number.
 * Format: M + YYYYMMDD + 4-digit sequence (e.g., "M202312090001")
 * 
 * Requirements: 2.4
 */
export function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate a random 4-digit sequence for uniqueness
  // In production, this could be a database sequence
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  return `M${dateStr}${sequence}`;
}

// ============================================
// MembershipOrderService Implementation
// ============================================

const membershipOrderRepository = new MembershipOrderRepository();
const membershipPlanRepository = new MembershipPlanRepository();
const paymentQRCodeRepository = new PaymentQRCodeRepository();

/**
 * Get all enabled payment QR codes.
 * 
 * Requirements: 2.1
 */
export async function getPaymentQRCodes(): Promise<PaymentQRCode[]> {
  return paymentQRCodeRepository.findEnabled();
}

/**
 * Create a new membership order.
 * Validates plan exists and is enabled, checks for duplicate pending orders.
 * 
 * Requirements: 2.2, 2.4, 2.5
 */
export async function createOrder(input: CreateOrderInput): Promise<MembershipOrder> {
  const { userId, planId, paymentType } = input;

  // Validate plan exists and is enabled
  const plan = await membershipPlanRepository.findById(planId);

  if (!plan) {
    throw { ...ORDER_ERRORS.PLAN_NOT_FOUND };
  }

  if (!plan.enabled) {
    throw { ...ORDER_ERRORS.PLAN_DISABLED };
  }

  // Validate plan is for VIP or SVIP (not free)
  if (plan.memberLevel === 'free') {
    throw { ...ORDER_ERRORS.PLAN_DISABLED };
  }

  // Check for duplicate pending orders
  const hasPending = await membershipOrderRepository.hasPendingOrder(userId, planId);

  if (hasPending) {
    throw { ...ORDER_ERRORS.DUPLICATE_PENDING_ORDER };
  }

  // Generate 4-digit random remark code
  const remarkCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Create order with plan details captured at creation time
  const order = await membershipOrderRepository.create({
    id: generateId(),
    orderNo: generateOrderNo(),
    userId,
    planId,
    memberLevel: plan.memberLevel,
    duration: plan.duration,
    price: plan.price,
    paymentType,
    remarkCode,
  });

  return order;
}

/**
 * Submit payment proof for an order.
 * Allows user to confirm payment.
 * 
 * Requirements: 2.3
 */
export async function submitPaymentProof(
  orderId: string,
  userId: string,
  input: SubmitPaymentProofInput
): Promise<MembershipOrder> {
  const order = await membershipOrderRepository.findById(orderId);

  if (!order) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  // Verify order belongs to user
  if (order.userId !== userId) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  // Only allow updating pending orders
  if (order.status !== 'pending') {
    throw { ...ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
  }

  const updatedOrder = await membershipOrderRepository.update(orderId, {
    status: 'paid', // Mark as user confirmed
    paymentScreenshot: input.screenshot, // Optional
    transactionNote: input.transactionNote, // Optional
  });

  if (!updatedOrder) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  return updatedOrder;
}

/**
 * Get user's order history with pagination.
 * 
 * Requirements: 9.1
 */
export async function getUserOrders(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<OrderListResult> {
  return membershipOrderRepository.list({
    userId,
    page,
    pageSize,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
}

/**
 * Admin: List all orders with filters.
 * 
 * Requirements: 6.1
 */
export async function listOrders(params: OrderListParams): Promise<OrderListResult> {
  return membershipOrderRepository.list(params);
}

/**
 * Admin: Approve an order and activate membership.
 * 
 * Requirements: 6.2, 6.5
 */
export async function approveOrder(
  orderId: string,
  adminId: string
): Promise<ApproveOrderResult> {
  const order = await membershipOrderRepository.findById(orderId);

  if (!order) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  // Only allow approving pending or paid orders
  if (order.status !== 'pending' && order.status !== 'paid') {
    throw { ...ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
  }

  // Update order status
  const updatedOrder = await membershipOrderRepository.update(orderId, {
    status: 'approved',
    reviewedBy: adminId,
    reviewedAt: new Date(),
  });

  if (!updatedOrder) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  // Activate membership for user
  await activateMembership(
    order.userId,
    order.memberLevel,
    order.duration
  );

  return {
    order: updatedOrder,
    membershipActivated: true,
  };
}

/**
 * Admin: Reject an order with reason.
 * 
 * Requirements: 6.3
 */
export async function rejectOrder(
  orderId: string,
  adminId: string,
  reason: string
): Promise<MembershipOrder> {
  const order = await membershipOrderRepository.findById(orderId);

  if (!order) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  // Only allow rejecting pending or paid orders
  if (order.status !== 'pending' && order.status !== 'paid') {
    throw { ...ORDER_ERRORS.ORDER_ALREADY_PROCESSED };
  }

  const updatedOrder = await membershipOrderRepository.update(orderId, {
    status: 'rejected',
    reviewedBy: adminId,
    reviewedAt: new Date(),
    rejectReason: reason,
  });

  if (!updatedOrder) {
    throw { ...ORDER_ERRORS.ORDER_NOT_FOUND };
  }

  return updatedOrder;
}

/**
 * Get an order by ID.
 */
export async function getOrderById(orderId: string): Promise<MembershipOrder | null> {
  return membershipOrderRepository.findById(orderId);
}

/**
 * Check if user has a pending order for a specific plan.
 * 
 * Requirements: 2.5
 */
export async function hasPendingOrder(userId: string, planId: string): Promise<boolean> {
  return membershipOrderRepository.hasPendingOrder(userId, planId);
}
