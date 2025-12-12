'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  CoinConfigSection,
  CoinOrderList,
  CoinOrderReviewModal,
  useToast
} from '@/components/admin';

// Define the CoinOrder interface locally or import it if shared
// Ideally should be imported, but for now matching the component's expectation
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

/**
 * Coin Management Page
 * Includes:
 * 1. Coin Configuration (Exchange rates, Packages)
 * 2. Coin Order Management (Review user recharges)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 7.5
 */
export default function CoinConfigPage() {
  const { getAccessToken } = useAdminAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'config'>('orders');
  const [reviewOrder, setReviewOrder] = useState<CoinOrder | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/console-x9k2m/settings"
          className="p-2 -ml-2 text-foreground/60 hover:text-foreground rounded-lg hover:bg-surface-secondary/50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">金币管理</h1>
          <p className="text-sm text-foreground/50 mt-1">管理金币充值订单及系统配置</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 bg-surface-secondary/30 rounded-xl mb-6 overflow-x-auto border border-border/10 w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-sm rounded-lg transition-all duration-200 whitespace-nowrap font-medium ${activeTab === 'orders'
            ? 'bg-surface text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
            : 'text-foreground/50 hover:text-foreground/70 hover:bg-surface-secondary/50'
            }`}
        >
          充值订单
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-sm rounded-lg transition-all duration-200 whitespace-nowrap font-medium ${activeTab === 'config'
            ? 'bg-surface text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
            : 'text-foreground/50 hover:text-foreground/70 hover:bg-surface-secondary/50'
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
