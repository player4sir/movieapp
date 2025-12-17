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

interface SearchedUser {
  id: string;
  username: string;
  nickname: string;
  coinBalance?: { balance: number };
}

export default function CoinConfigPage() {
  const { getAccessToken } = useAdminAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'adjust' | 'config'>('orders');
  const [reviewOrder, setReviewOrder] = useState<CoinOrder | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Adjust tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

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

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const token = getAccessToken();
    if (!token) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data || []);
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  // Select user and fetch balance
  const handleSelectUser = async (user: SearchedUser) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUser({
          ...user,
          coinBalance: data.coinBalance || { balance: 0 }
        });
      }
    } catch (e) {
      console.error('Fetch user failed:', e);
      setSelectedUser(user);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  // Adjust balance
  const handleAdjust = async () => {
    if (!selectedUser) return;
    const token = getAccessToken();
    if (!token) return;

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      showToast({ message: '请输入有效金额', type: 'error' });
      return;
    }
    if (!adjustNote.trim()) {
      showToast({ message: '请输入调整原因', type: 'error' });
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch('/api/admin/coins/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount,
          note: adjustNote.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '调整失败');
      }

      const data = await res.json();
      showToast({ message: `调整成功，新余额: ${data.newBalance}`, type: 'success' });

      // Update displayed balance
      setSelectedUser(prev => prev ? {
        ...prev,
        coinBalance: { balance: data.newBalance }
      } : null);

      setAdjustAmount('');
      setAdjustNote('');
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : '调整失败', type: 'error' });
    } finally {
      setAdjusting(false);
    }
  };

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
          onClick={() => setActiveTab('adjust')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'adjust'
            ? 'border-primary text-primary'
            : 'border-transparent text-foreground/50 hover:text-foreground'
            }`}
        >
          余额调整
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

      {activeTab === 'adjust' && (
        <div className="space-y-4">
          {/* Search User */}
          <div className="bg-surface rounded-lg p-4">
            <h3 className="font-medium mb-3">搜索用户</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入用户名或昵称搜索"
                className="flex-1 px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
              >
                {searching ? '...' : '搜索'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 border border-surface-secondary rounded-lg divide-y divide-surface-secondary">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-surface-secondary/50 text-left"
                  >
                    <div>
                      <span className="font-medium">{user.username}</span>
                      {user.nickname && <span className="text-foreground/50 ml-2">{user.nickname}</span>}
                    </div>
                    <span className="text-xs text-foreground/50">点击选择</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected User & Adjust */}
          {selectedUser && (
            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">{selectedUser.username}</h3>
                  <p className="text-sm text-foreground/50">{selectedUser.nickname || '未设置昵称'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-500">{selectedUser.coinBalance?.balance ?? 0}</p>
                  <p className="text-xs text-foreground/50">当前余额</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="输入金额（正数增加，负数扣除）"
                  className="w-full px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="调整原因（必填）"
                  className="w-full px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-2 text-sm text-foreground/70 border border-surface-secondary rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAdjust}
                    disabled={adjusting || !adjustAmount || !adjustNote.trim()}
                    className="flex-1 py-2 text-sm bg-primary text-white rounded-lg disabled:opacity-50"
                  >
                    {adjusting ? '处理中...' : '确认调整'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedUser && (
            <div className="text-center py-12 text-foreground/50">
              <svg className="w-12 h-12 mx-auto mb-3 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>搜索并选择用户以调整金币余额</p>
            </div>
          )}
        </div>
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

