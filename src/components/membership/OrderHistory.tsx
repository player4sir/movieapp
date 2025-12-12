'use client';

/**
 * OrderHistory Component
 * Displays user's orders with status
 * Shows order details
 * 
 * Requirements: 9.1 - Display orders with status, plan details, and timestamps
 * Requirements: 9.3 - Display membership activation details for approved orders
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks';

interface MembershipOrder {
  id: string;
  orderNo: string;
  planId: string;
  memberLevel: 'vip' | 'svip';
  duration: number;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentType: 'wechat' | 'alipay' | null;
  paymentScreenshot: string | null;
  transactionNote: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderHistoryProps {
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: '待审核',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  approved: {
    label: '已通过',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  rejected: {
    label: '已拒绝',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
};

const LEVEL_CONFIG = {
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

export function OrderHistory({ className = '' }: OrderHistoryProps) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<MembershipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);



  const fetchOrders = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/membership/orders?page=${page}&pageSize=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const orderList = Array.isArray(data.orders) ? data.orders : [];

        if (page === 1) {
          setOrders(orderList);
        } else {
          setOrders(prev => [...prev, ...orderList]);
        }

        setHasMore(data.pagination?.hasMore || false);
      } else {
        setError('获取订单失败');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, page]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  if (loading && orders.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-surface rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-surface-secondary rounded w-32 mb-2" />
            <div className="h-3 bg-surface-secondary rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button onClick={() => fetchOrders()} className="text-primary text-sm underline">
          重试
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <svg className="w-16 h-16 mx-auto text-foreground/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-foreground/50">暂无订单记录</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {orders.map(order => {
        const statusConfig = STATUS_CONFIG[order.status];
        const levelConfig = LEVEL_CONFIG[order.memberLevel];
        const isExpanded = expandedOrderId === order.id;

        return (
          <div
            key={order.id}
            className="bg-surface rounded-xl overflow-hidden"
          >
            {/* Order Header */}
            <button
              onClick={() => toggleExpand(order.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${levelConfig.color}`}>
                    {levelConfig.label}
                  </span>
                  <span className="text-foreground/60 text-sm">
                    {formatDuration(order.duration)}
                  </span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/50">
                  {formatDate(order.createdAt)}
                </span>
                <span className="font-medium">
                  ¥{formatPrice(order.price)}
                </span>
              </div>

              {/* Expand indicator */}
              <div className="flex justify-center mt-2">
                <svg
                  className={`w-4 h-4 text-foreground/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-surface-secondary pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/50">订单号</span>
                  <span className="font-mono text-foreground/80">{order.orderNo}</span>
                </div>

                {order.paymentType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/50">支付方式</span>
                    <span className="text-foreground/80">
                      {order.paymentType === 'wechat' ? '微信支付' : '支付宝'}
                    </span>
                  </div>
                )}

                {order.transactionNote && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/50">交易备注</span>
                    <span className="text-foreground/80 text-right max-w-[60%] truncate">
                      {order.transactionNote}
                    </span>
                  </div>
                )}

                {order.status === 'pending' && (
                  <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg">
                    <p className="text-yellow-500 text-sm">
                      订单正在审核中，预计1-24小时内完成审核
                    </p>
                  </div>
                )}

                {order.status === 'approved' && order.reviewedAt && (
                  <div className="mt-3 p-3 bg-green-500/10 rounded-lg">
                    <p className="text-green-500 text-sm">
                      会员已于 {formatDate(order.reviewedAt)} 开通成功
                    </p>
                  </div>
                )}

                {order.status === 'rejected' && (
                  <div className="mt-3 p-3 bg-red-500/10 rounded-lg">
                    <p className="text-red-400 text-sm">
                      {order.rejectReason || '订单已被拒绝'}
                    </p>
                  </div>
                )}

                {order.paymentScreenshot && (
                  <div className="mt-3">
                    <p className="text-foreground/50 text-sm mb-2">支付截图</p>
                    <img
                      src={order.paymentScreenshot}
                      alt="Payment screenshot"
                      className="w-full max-h-48 object-contain rounded-lg bg-surface-secondary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={loading}
          className="w-full py-3 text-primary text-sm font-medium"
        >
          {loading ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  );
}

export default OrderHistory;
