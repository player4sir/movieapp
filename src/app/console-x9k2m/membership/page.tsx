'use client';

/**
 * Admin Membership Management Page
 * Manages membership plans and payment QR codes
 * 
 * Requirements: 7.1, 7.2
 */

import { useState, useCallback } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  MembershipPlanManager,
  PaymentQRManager,
  useToast,
  ToastProvider,
} from '@/components/admin';

type TabType = 'plans' | 'qrcodes';

function MembershipPageContent() {
  const { getAccessToken } = useAdminAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('plans');

  const handleShowToast = useCallback((message: string, type: 'success' | 'error') => {
    showToast({ message, type });
  }, [showToast]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'plans', label: '套餐管理' },
    { key: 'qrcodes', label: '收款码' },
  ];

  return (
    <div className="p-4 lg:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">会员管理</h1>
        <p className="text-foreground/60 text-sm mt-1">
          管理会员套餐和收款码
        </p>
      </div>

      {/* Tabs - Segmented Control Style */}
      <div className="flex gap-1 p-1.5 bg-surface-secondary/30 rounded-xl mb-6 overflow-x-auto border border-border/10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm rounded-lg transition-all duration-200 whitespace-nowrap font-medium ${activeTab === tab.key
              ? 'bg-surface text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-foreground/50 hover:text-foreground/70 hover:bg-surface-secondary/50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'plans' && (
        <MembershipPlanManager
          getAccessToken={getAccessToken}
          onShowToast={handleShowToast}
        />
      )}

      {activeTab === 'qrcodes' && (
        <PaymentQRManager
          getAccessToken={getAccessToken}
          onShowToast={handleShowToast}
        />
      )}
    </div>
  );
}

export default function MembershipPage() {
  return (
    <ToastProvider>
      <MembershipPageContent />
    </ToastProvider>
  );
}

