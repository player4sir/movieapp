'use client';

/**
 * Admin Order Management Page
 * Unified view for membership orders and coin recharge orders
 */

import { useState, useCallback } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
    MembershipOrderList,
    OrderReviewModal,
    CoinOrderList,
    CoinOrderReviewModal,
    useToast,
    ToastProvider,
} from '@/components/admin';

type TabType = 'membership' | 'coin';

interface MembershipOrder {
    id: string;
    orderNo: string;
    userId: string;
    planId: string;
    memberLevel: 'vip' | 'svip';
    duration: number;
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
    user?: { id: string; username: string; nickname: string | null };
}

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

function OrdersPageContent() {
    const { getAccessToken } = useAdminAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('membership');
    const [reviewMembershipOrder, setReviewMembershipOrder] = useState<MembershipOrder | null>(null);
    const [reviewCoinOrder, setReviewCoinOrder] = useState<CoinOrder | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleReviewMembershipOrder = useCallback((order: MembershipOrder) => {
        setReviewMembershipOrder(order);
    }, []);

    const handleReviewCoinOrder = useCallback((order: CoinOrder) => {
        setReviewCoinOrder(order);
    }, []);

    const handleReviewSuccess = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    const handleShowToast = useCallback((message: string, type: 'success' | 'error') => {
        showToast({ message, type });
    }, [showToast]);

    const tabs: { key: TabType; label: string }[] = [
        { key: 'membership', label: '会员订单' },
        { key: 'coin', label: '充值订单' },
    ];

    return (
        <div className="p-4 lg:p-6">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">订单管理</h1>
                <p className="text-foreground/60 text-sm mt-1">
                    审核会员购买和金币充值订单
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
            {activeTab === 'membership' && (
                <MembershipOrderList
                    key={`membership-${refreshKey}`}
                    getAccessToken={getAccessToken}
                    onReviewOrder={handleReviewMembershipOrder}
                    onShowToast={handleShowToast}
                />
            )}

            {activeTab === 'coin' && (
                <CoinOrderList
                    key={`coin-${refreshKey}`}
                    getAccessToken={getAccessToken}
                    onReviewOrder={handleReviewCoinOrder}
                    onShowToast={handleShowToast}
                />
            )}

            {/* Membership Order Review Modal */}
            <OrderReviewModal
                isOpen={!!reviewMembershipOrder}
                onClose={() => setReviewMembershipOrder(null)}
                order={reviewMembershipOrder}
                getAccessToken={getAccessToken}
                onSuccess={handleReviewSuccess}
                onShowToast={handleShowToast}
            />

            {/* Coin Order Review Modal */}
            <CoinOrderReviewModal
                isOpen={!!reviewCoinOrder}
                onClose={() => setReviewCoinOrder(null)}
                order={reviewCoinOrder}
                getAccessToken={getAccessToken}
                onSuccess={handleReviewSuccess}
                onShowToast={handleShowToast}
            />
        </div>
    );
}

export default function OrdersPage() {
    return (
        <ToastProvider>
            <OrdersPageContent />
        </ToastProvider>
    );
}
