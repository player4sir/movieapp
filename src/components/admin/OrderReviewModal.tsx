'use client';

/**
 * OrderReviewModal Component
 * Display order details
 * Approve/reject buttons
 * Rejection reason input
 * 
 * Requirements: 6.2, 6.3
 */

import { useState, useCallback } from 'react';

type OrderStatus = 'pending' | 'approved' | 'rejected';
type PaymentType = 'wechat' | 'alipay';
type MemberLevel = 'vip' | 'svip';

interface MembershipOrder {
  id: string;
  orderNo: string;
  userId: string;
  planId: string;
  memberLevel: MemberLevel;
  duration: number;
  price: number;
  status: OrderStatus;
  paymentType: PaymentType | null;
  paymentScreenshot: string | null;
  transactionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  remarkCode: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    nickname: string | null;
  };
}

export interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MembershipOrder | null;
  getAccessToken: () => string | null;
  onSuccess?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const LEVEL_CONFIG: Record<MemberLevel, { label: string; color: string }> = {
  vip: { label: 'VIP', color: 'text-yellow-500' },
  svip: { label: 'SVIP', color: 'text-purple-400' },
};

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}年`;
  if (days >= 30) return `${Math.floor(days / 30)}个月`;
  return `${days}天`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderReviewModal({
  isOpen,
  onClose,
  order,
  getAccessToken,
  onSuccess,
  onShowToast,
}: OrderReviewModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  }, [onShowToast]);

  const handleApprove = useCallback(async () => {
    if (!order) return;
    const token = getAccessToken();
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/membership/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '审核失败');
      }

      showToast('订单已通过，会员已激活', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '审核失败', 'error');
    } finally {
      setProcessing(false);
    }
  }, [order, getAccessToken, showToast, onSuccess, onClose]);

  const handleReject = useCallback(async () => {
    if (!order) return;
    if (!rejectReason.trim()) {
      showToast('请输入拒绝原因', 'error');
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/membership/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '拒绝失败');
      }

      showToast('订单已拒绝', 'success');
      setRejectReason('');
      setShowRejectForm(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '拒绝失败', 'error');
    } finally {
      setProcessing(false);
    }
  }, [order, rejectReason, getAccessToken, showToast, onSuccess, onClose]);

  const handleClose = () => {
    setRejectReason('');
    setShowRejectForm(false);
    onClose();
  };

  if (!isOpen || !order) return null;

  const levelConfig = LEVEL_CONFIG[order.memberLevel];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-background rounded-t-xl lg:rounded-lg w-full lg:max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-secondary">
          <h2 className="text-lg font-semibold">审核订单</h2>
          <button onClick={handleClose} className="p-1 text-foreground/50 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Remark Code (Verification) */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <span className="text-primary text-sm mb-1">支付验证码</span>
            <span className="text-4xl font-black text-primary tracking-widest bg-white/50 px-4 py-2 rounded-lg border border-dashed border-primary/30">
              {order.remarkCode || '无'}
            </span>
            <span className="text-xs text-primary/60 mt-2">请核对支付备注是否包含此代码</span>
          </div>

          {/* Order Info */}
          <div className="bg-surface rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${levelConfig.color}`}>
                  {levelConfig.label}
                </span>
                <span className="text-foreground/60">
                  {formatDuration(order.duration)}
                </span>
              </div>
              <span className="text-xl font-bold">¥{formatPrice(order.price)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-foreground/50">订单号</span>
                <p className="font-mono">{order.orderNo}</p>
              </div>
              <div>
                <span className="text-foreground/50">用户</span>
                <p>{order.user?.username || order.userId.slice(0, 8)}</p>
              </div>
              <div>
                <span className="text-foreground/50">支付方式</span>
                <p>
                  {order.paymentType === 'wechat' ? '微信支付' :
                    order.paymentType === 'alipay' ? '支付宝' : '-'}
                </p>
              </div>
              <div>
                <span className="text-foreground/50">下单时间</span>
                <p>{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Transaction Note */}
          {order.transactionNote && (
            <div className="bg-surface rounded-lg p-4">
              <p className="text-sm text-foreground/50 mb-2">交易备注</p>
              <p className="text-foreground/80">{order.transactionNote}</p>
            </div>
          )}

          {/* Payment Screenshot */}
          {order.paymentScreenshot && (
            <div className="bg-surface rounded-lg p-4">
              <p className="text-sm text-foreground/50 mb-2">支付截图</p>
              <img
                src={order.paymentScreenshot}
                alt="Payment screenshot"
                className="w-full max-h-80 object-contain rounded-lg bg-surface-secondary"
              />
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="bg-surface rounded-lg p-4">
              <p className="text-sm text-foreground/50 mb-2">拒绝原因</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                className="w-full px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-surface-secondary space-y-2">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                className="flex-1 py-3 text-sm font-medium text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
              >
                拒绝
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-3 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {processing ? '处理中...' : '通过'}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                disabled={processing}
                className="flex-1 py-3 text-sm font-medium text-foreground/70 border border-surface-secondary rounded-lg hover:bg-surface-secondary disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 py-3 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {processing ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderReviewModal;
