'use client';

/**
 * MembershipOrderList Component
 * Display orders with status filters
 * Show payment screenshots and notes
 * 
 * Requirements: 6.1, 6.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TableSkeleton, NetworkError } from './index';

type OrderStatus = 'pending' | 'paid' | 'approved' | 'rejected';
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

interface OrderListResult {
  data: MembershipOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface MembershipOrderListProps {
  getAccessToken: () => string | null;
  onReviewOrder?: (order: MembershipOrder) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待审核', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  paid: { label: '已支付', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  approved: { label: '已通过', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  rejected: { label: '已拒绝', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MembershipOrderList({
  getAccessToken,
  onReviewOrder,
}: MembershipOrderListProps) {
  const [orders, setOrders] = useState<MembershipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      // When '新订单' is selected (empty filter), request pending+paid orders from server
      if (statusFilter === '') {
        params.set('status', 'pending,paid');
      } else {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/membership/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('获取订单列表失败');
      }

      const result: OrderListResult = await response.json();
      setOrders(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err instanceof Error ? err.message : '获取订单失败');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusFilterChange = (status: OrderStatus | '') => {
    setStatusFilter(status);
    setPage(1);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  if (loading && orders.length === 0) {
    return <TableSkeleton rows={5} columns={4} />;
  }

  if (error && orders.length === 0) {
    return <NetworkError message={error} type="network" onRetry={fetchOrders} />;
  }

  return (
    <div className="space-y-4">
      {/* Status Filter - Simplified */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => handleStatusFilterChange('')}
          className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${statusFilter === ''
            ? 'bg-primary text-white'
            : 'bg-surface text-foreground/70 hover:bg-surface-secondary'
            }`}
        >
          新订单
        </button>
        <button
          onClick={() => handleStatusFilterChange('approved')}
          className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${statusFilter === 'approved'
            ? 'bg-primary text-white'
            : 'bg-surface text-foreground/70 hover:bg-surface-secondary'
            }`}
        >
          已通过
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border/50 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary/50 text-foreground/60 font-medium border-b border-border/50">
              <tr>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">订单号</th>
                <th className="px-4 py-3">验证码</th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">开通会员</th>
                <th className="px-4 py-3">金额/时长</th>
                <th className="px-4 py-3">支付方式</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status];
                const levelConfig = LEVEL_CONFIG[order.memberLevel];
                const isExpanded = expandedOrderId === order.id;

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      onClick={() => toggleExpand(order.id)}
                      className={`hover:bg-surface-secondary/30 transition-colors cursor-pointer ${isExpanded ? 'bg-surface-secondary/30' : ''
                        }`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground/60">
                        {order.orderNo}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-primary">
                        {order.remarkCode || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-foreground/90 font-medium text-xs">
                            {order.user?.username || '未知用户的'}
                          </span>
                          <span className="text-foreground/40 text-[10px] font-mono">
                            ID: {order.userId.slice(0, 6)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${levelConfig.color}`}>
                          {levelConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">¥{formatPrice(order.price)}</span>
                          <span className="text-xs text-foreground/50">{formatDuration(order.duration)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground/70">
                        康讯支付
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/50 font-mono">
                        {formatDate(order.createdAt).split(' ')[0]}
                        <br />
                        {formatDate(order.createdAt).split(' ')[1]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {(order.status === 'pending' || order.status === 'paid') && onReviewOrder && (
                            <button
                              onClick={() => onReviewOrder(order)}
                              className="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                            >
                              审核
                            </button>
                          )}
                          <button
                            onClick={() => toggleExpand(order.id)}
                            className={`p-1 rounded-md hover:bg-surface-secondary transition-colors ${isExpanded ? 'text-primary' : 'text-foreground/40'}`}
                          >
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row Details */}
                    {isExpanded && (
                      <tr className="bg-surface-secondary/10">
                        <td colSpan={9} className="px-4 pb-4 pt-0">
                          <div className="p-4 bg-surface rounded-lg border border-border/50 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">详细信息</h4>
                              <div className="space-y-2 text-sm">
                                <p><span className="text-foreground/50 w-20 inline-block">提交时间:</span> {formatDate(order.createdAt)}</p>
                                <p><span className="text-foreground/50 w-20 inline-block">验证码:</span> <span className="font-mono font-bold text-primary">{order.remarkCode || '-'}</span></p>
                                {order.reviewedAt && <p><span className="text-foreground/50 w-20 inline-block">审核时间:</span> {formatDate(order.reviewedAt)}</p>}
                                {order.transactionNote && <p><span className="text-foreground/50 w-20 inline-block">备注:</span> {order.transactionNote}</p>}
                                {order.rejectReason && <p className="text-red-500"><span className="text-red-400 w-20 inline-block">拒绝原因:</span> {order.rejectReason}</p>}
                              </div>
                            </div>
                            {order.paymentScreenshot && (
                              <div>
                                <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">支付凭证</h4>
                                <img src={order.paymentScreenshot} alt="凭证" className="h-40 rounded-lg border border-border/50 object-cover cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => window.open(order.paymentScreenshot!, '_blank')} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (Refined) */}
        <div className="lg:hidden bg-surface-secondary/10 p-2 space-y-3">
          {orders.map(order => {
            const statusConfig = STATUS_CONFIG[order.status];
            const isExpanded = expandedOrderId === order.id;

            return (
              <div key={order.id} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border/30">
                {/* Card Header - Condensed */}
                <div className="p-4" onClick={() => toggleExpand(order.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${order.memberLevel === 'svip' ? 'bg-purple-500/10 text-purple-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                        {order.memberLevel === 'svip' ? 'SVIP' : 'VIP'}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground/90">
                          {order.user?.username || '未知用户'}
                        </div>
                        <div className="text-xs text-foreground/50 font-mono">
                          {order.orderNo.slice(-8)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-lg">¥{formatPrice(order.price)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="flex items-center gap-4 text-xs text-foreground/50">
                    <span>{formatDuration(order.duration)}</span>
                    <span>•</span>
                    <span>康讯支付</span>
                    <span>•</span>
                    <span>{formatDate(order.createdAt).split(' ')[0]}</span>
                  </div>
                </div>

                {/* Expandable Content for Mobile */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-dashed border-border/50 mt-2">
                    <div className="pt-4 space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-surface-secondary/30 rounded">
                          <span className="block text-foreground/40 mb-1">订单全号</span>
                          <span className="font-mono break-all">{order.orderNo}</span>
                        </div>
                        <div className="p-2 bg-surface-secondary/30 rounded">
                          <span className="block text-foreground/40 mb-1">验证码</span>
                          <span className="font-mono font-bold text-primary">{order.remarkCode || '-'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-surface-secondary/30 rounded">
                          <span className="block text-foreground/40 mb-1">交易时间</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>

                      {order.transactionNote && (
                        <p className="text-foreground/80 bg-surface-secondary/20 p-2 rounded text-xs">
                          <span className="text-foreground/40 mr-1">备注:</span> {order.transactionNote}
                        </p>
                      )}

                      {order.paymentScreenshot && (
                        <div className="mt-2">
                          <p className="text-xs text-foreground/40 mb-1">支付凭证</p>
                          <img
                            src={order.paymentScreenshot}
                            alt="凭证"
                            className="w-full rounded-lg object-cover max-h-48"
                          />
                        </div>
                      )}

                      {(order.status === 'pending' || order.status === 'paid') && onReviewOrder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReviewOrder(order);
                          }}
                          className="w-full py-3 text-sm bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] mt-2 shadow-lg shadow-primary/20"
                        >
                          立即审核
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-surface rounded-lg disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-foreground/60">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm bg-surface rounded-lg disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default MembershipOrderList;
