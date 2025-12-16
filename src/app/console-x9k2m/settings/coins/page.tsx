'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  CoinConfigSection,
  CoinOrderList,
  CoinOrderReviewModal,
  useToast
} from '@/components/admin';

interface CoinOrder {
  id: string;
  orderNo: string;
  userId: string;
  amount: number;
  price: number;
  status: 'pending' | 'paid' | 'approved' | 'rejected';
  paymentType: 'wechat' | 'alipay' | null;
  paymentScreenshot: string | null;
  transactionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  remarkCode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  pendingOrders: { coin: number };
  paidOrders: { coin: number };
}

export default function CoinConfigPage() {
  const { getAccessToken } = useAdminAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'config'>('orders');
  const [reviewOrder, setReviewOrder] = useState<CoinOrder | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取待处理订单数量
  const { data: orderStats } = useSWR<OrderStats>(
    '/api/admin/orders/stats',
    async (url) => {
      const token = getAccessToken();
      if (!token) return null;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    { refreshInterval: 30000 }
  );

  const pendingCount = (orderStats?.pendingOrders?.coin ?? 0) + (orderStats?.paidOrders?.coin ?? 0);

  const handleReviewOrder = useCallback((order: CoinOrder) => {
    setReviewOrder(order);
  }, []);

  const handleReviewSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleShowToast = useCallback((message: string, type: 'success' | 'error') => {
    showToast({ message, type });
  }, [showToast]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* 简洁头部 */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/console-x9k2m/settings"
          className="p-1.5 text-foreground/50 hover:text-foreground rounded-lg hover:bg-surface"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">金币管理</h1>
      </div>

      {/* 紧凑Tab */}
      <div className="flex gap-1 mb-4 border-b border-border/50">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/50 hover:text-foreground'
            }`}
        >
          充值订单
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-500/10 text-amber-500 rounded">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'config'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/50 hover:text-foreground'
            }`}
        >
          系统配置
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <CoinOrderList
          key={refreshKey}
          getAccessToken={getAccessToken}
          onReviewOrder={handleReviewOrder}
          onShowToast={handleShowToast}
        />
      )}

      {activeTab === 'config' && (
        <CoinConfigSection
          onShowToast={(text, type) => handleShowToast(text, type as 'success' | 'error')}
        />
      )}

      {/* Review Modal */}
      <CoinOrderReviewModal
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        getAccessToken={getAccessToken}
        onSuccess={handleReviewSuccess}
        onShowToast={handleShowToast}
      />
    </div>
  );
}
