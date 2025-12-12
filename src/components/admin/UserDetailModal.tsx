'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserDetailSkeleton } from './Skeletons';
import { NetworkError } from './NetworkError';
import type { EffectivePermissions, UserSession } from '@/types/admin';
import type { MemberLevel } from '@/types/auth';

/**
 * User detail response from API
 * Requirements: 3.1
 */
interface UserDetailResponse {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  memberLevel: MemberLevel;
  memberExpiry: string | null;
  groupId: string | null;
  group: { id: string; name: string; color: string } | null;
  effectivePermissions: EffectivePermissions;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  stats: {
    favoritesCount: number;
    watchHistoryCount: number;
    totalWatchTime: number;
    activeSessionsCount: number;
  };
}

/**
 * Coin balance response from API
 * Requirements: 6.3
 */
interface CoinBalanceResponse {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

/**
 * Recent coin transaction
 * Requirements: 6.3
 */
interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  getAccessToken: () => string | null;
  onEdit?: (userId: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

/**
 * User Detail Modal Component
 * Displays essential user information: account, membership, group, sessions
 * Requirements: 3.1, 5.1
 */
export function UserDetailModal({
  isOpen,
  onClose,
  userId,
  getAccessToken,
  onEdit,
  onShowToast,
}: UserDetailModalProps) {
  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'sessions' | 'coins'>('info');
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);
  
  // Coin-related state (Requirements: 6.1, 6.2, 6.3)
  const [coinBalance, setCoinBalance] = useState<CoinBalanceResponse | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');
  const [adjusting, setAdjusting] = useState(false);
  
  // Helper to show toast notifications
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  }, [onShowToast]);

  const fetchUserDetail = useCallback(async () => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('获取用户详情失败');
      const data = await res.json();
      setUser(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setLoading(false);
    }
  }, [userId, getAccessToken]);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  }, [userId, getAccessToken]);

  /**
   * Fetch user's coin balance
   * Requirements: 6.3
   */
  const fetchCoinBalance = useCallback(async () => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    try {
      // Fetch balance using admin endpoint that includes coin balance
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.coinBalance) {
          setCoinBalance(data.coinBalance);
        } else {
          // User has no coin balance record yet
          setCoinBalance({ balance: 0, totalEarned: 0, totalSpent: 0 });
        }
      }
      
      // Fetch recent transactions using admin endpoint
      const txRes = await fetch(`/api/admin/users/${userId}/transactions?pageSize=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        setRecentTransactions(txData.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch coin balance:', e);
    }
  }, [userId, getAccessToken]);

  /**
   * Adjust user's coin balance
   * Requirements: 6.1, 6.2
   */
  const handleAdjustBalance = useCallback(async () => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      showToast('请输入有效的调整金额', 'error');
      return;
    }

    if (!adjustNote.trim()) {
      showToast('请输入调整原因', 'error');
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch('/api/admin/coins/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          amount,
          note: adjustNote.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '调整失败');
      }

      const data = await res.json();
      showToast(`金币调整成功，新余额: ${data.newBalance}`, 'success');
      setAdjustAmount('');
      setAdjustNote('');
      
      // Refresh coin balance
      fetchCoinBalance();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '调整失败', 'error');
    } finally {
      setAdjusting(false);
    }
  }, [userId, getAccessToken, adjustAmount, adjustNote, showToast, fetchCoinBalance]);

  /**
   * Terminate a specific session
   * Requirements: 7.2
   */
  const terminateSession = useCallback(async (sessionId: string) => {
    if (!userId) return;
    const token = getAccessToken();
    if (!token) return;

    setTerminatingSessionId(sessionId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '终止会话失败');
      }
      
      // Remove the terminated session from the list
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('会话已终止', 'success');
      
      // Refresh user detail to update session count
      fetchUserDetail();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '终止会话失败', 'error');
    } finally {
      setTerminatingSessionId(null);
    }
  }, [userId, getAccessToken, fetchUserDetail, showToast]);

  /**
   * Terminate all sessions for the user
   * Requirements: 6.3
   */
  const terminateAllSessions = useCallback(async () => {
    if (!userId) return;
    if (!confirm('确定终止该用户的所有会话？')) return;
    const token = getAccessToken();
    if (!token) return;

    setTerminatingAll(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '终止所有会话失败');
      }
      
      const data = await res.json();
      
      // Clear all sessions from the list
      setSessions([]);
      showToast(`已终止 ${data.affected} 个会话`, 'success');
      
      // Refresh user detail to update session count
      fetchUserDetail();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '终止所有会话失败', 'error');
    } finally {
      setTerminatingAll(false);
    }
  }, [userId, getAccessToken, fetchUserDetail, showToast]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetail();
      fetchSessions();
      fetchCoinBalance();
      setActiveTab('info');
      // Reset coin adjustment form
      setAdjustAmount('');
      setAdjustNote('');
    }
  }, [isOpen, userId, fetchUserDetail, fetchSessions, fetchCoinBalance]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-background rounded-t-xl lg:rounded-lg w-full lg:max-w-lg max-h-[85vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-secondary">
          <h2 className="text-lg font-semibold">
            {user ? `用户详情` : '用户详情'}
          </h2>
          <button onClick={onClose} className="p-1 text-foreground/50 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading Skeleton (Requirements 5.4) */}
          {loading ? (
            <UserDetailSkeleton />
          ) : error ? (
            <NetworkError message={error} type="network" onRetry={fetchUserDetail} />
          ) : user ? (
            <div className="space-y-4">
              {/* User Header - Simplified */}
              <div className="flex items-center gap-3 pb-3 border-b border-surface-secondary">
                <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center text-lg font-semibold text-foreground/50">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{user.username}</span>
                    {user.role === 'admin' && (
                      <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded">管理员</span>
                    )}
                    <span className={`px-1.5 py-0.5 text-xs rounded ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {user.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/60 truncate">{user.nickname || '未设置昵称'}</p>
                </div>
                {onEdit && (
                  <button onClick={() => onEdit(user.id)} className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg">
                    编辑
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-surface-secondary rounded-lg">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === 'info' ? 'bg-surface text-foreground font-medium' : 'text-foreground/60'
                  }`}
                >
                  信息
                </button>
                <button
                  onClick={() => setActiveTab('coins')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === 'coins' ? 'bg-surface text-foreground font-medium' : 'text-foreground/60'
                  }`}
                >
                  金币
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeTab === 'sessions' ? 'bg-surface text-foreground font-medium' : 'text-foreground/60'
                  }`}
                >
                  会话 ({sessions.length})
                </button>
              </div>

              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-3">
                  {/* Membership & Group */}
                  <div className="bg-surface rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-foreground/50 text-xs">会员等级</span>
                        <p className="font-medium"><MemberBadge level={user.memberLevel} /></p>
                      </div>
                      <div>
                        <span className="text-foreground/50 text-xs">到期时间</span>
                        <p className="font-medium text-sm">{user.memberExpiry ? formatDate(user.memberExpiry) : '永久'}</p>
                      </div>
                      <div>
                        <span className="text-foreground/50 text-xs">用户组</span>
                        <p className="font-medium">
                          {user.group ? (
                            <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: `${user.group.color}20`, color: user.group.color }}>
                              {user.group.name}
                            </span>
                          ) : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-foreground/50 text-xs">权限来源</span>
                        <p className="font-medium text-sm">{user.effectivePermissions.source === 'group' ? '用户组' : '个人'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="bg-surface rounded-lg p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground/50">注册时间</span>
                        <span>{formatDate(user.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/50">最后登录</span>
                        <span>{formatDate(user.lastLoginAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/50">活跃会话</span>
                        <span>{user.stats.activeSessionsCount} 个</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coins Tab (Requirements: 6.1, 6.2, 6.3) */}
              {activeTab === 'coins' && (
                <div className="space-y-3">
                  {/* Balance Display */}
                  <div className="bg-surface rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <CoinIcon />
                      <span className="font-medium">金币余额</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-yellow-500">
                          {coinBalance?.balance ?? 0}
                        </p>
                        <p className="text-xs text-foreground/50">当前余额</p>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-green-500">
                          +{coinBalance?.totalEarned ?? 0}
                        </p>
                        <p className="text-xs text-foreground/50">累计获得</p>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-red-500">
                          -{coinBalance?.totalSpent ?? 0}
                        </p>
                        <p className="text-xs text-foreground/50">累计消费</p>
                      </div>
                    </div>
                  </div>

                  {/* Balance Adjustment */}
                  <div className="bg-surface rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">调整余额</p>
                    <div className="space-y-2">
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
                      <button
                        onClick={handleAdjustBalance}
                        disabled={adjusting || !adjustAmount || !adjustNote.trim()}
                        className="w-full py-2 text-sm bg-primary text-white rounded-lg disabled:opacity-50"
                      >
                        {adjusting ? '处理中...' : '确认调整'}
                      </button>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-surface rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">最近交易</p>
                    {recentTransactions.length === 0 ? (
                      <p className="text-center py-4 text-foreground/50 text-sm">暂无交易记录</p>
                    ) : (
                      <div className="space-y-2">
                        {recentTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-surface-secondary last:border-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">{tx.description}</p>
                              <p className="text-xs text-foreground/50">
                                {new Date(tx.createdAt).toLocaleString('zh-CN')}
                              </p>
                            </div>
                            <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sessions Tab (Requirements: 6.1, 6.2, 6.3) */}
              {activeTab === 'sessions' && (
                <div className="space-y-3">
                  {sessions.length > 0 && (
                    <button
                      onClick={terminateAllSessions}
                      disabled={terminatingAll}
                      className="w-full py-2 text-sm text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {terminatingAll ? '终止中...' : `终止所有会话 (${sessions.length})`}
                    </button>
                  )}
                  
                  {sessions.length === 0 ? (
                    <p className="text-center py-6 text-foreground/50">暂无活跃会话</p>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="p-3 bg-surface rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DeviceIcon userAgent={session.userAgent} />
                            <span className="text-sm font-medium">
                              {session.deviceInfo || parseDeviceInfo(session.userAgent)}
                            </span>
                            {session.isCurrent && (
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-xs rounded">当前</span>
                            )}
                          </div>
                          <button
                            onClick={() => terminateSession(session.id)}
                            disabled={terminatingSessionId === session.id || terminatingAll}
                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            {terminatingSessionId === session.id ? '...' : '终止'}
                          </button>
                        </div>
                        <div className="text-xs text-foreground/50 space-y-0.5">
                          <p>IP: {session.ipAddress || '-'}</p>
                          <p>最后活动: {formatDate(session.lastActivityAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MemberBadge({ level }: { level: string }) {
  const styles: Record<string, string> = { 
    free: 'text-foreground/70', 
    vip: 'text-yellow-500', 
    svip: 'text-purple-500' 
  };
  const labels: Record<string, string> = { 
    free: '免费', 
    vip: 'VIP', 
    svip: 'SVIP' 
  };
  return <span className={`font-medium ${styles[level]}`}>{labels[level]}</span>;
}

/**
 * Parse device info from user agent string
 */
function parseDeviceInfo(userAgent: string): string {
  if (!userAgent) return '未知设备';
  
  // Detect browser
  let browser = '未知浏览器';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }
  
  // Detect OS
  let os = '未知系统';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }
  
  return `${browser} on ${os}`;
}

/**
 * Device icon based on user agent
 */
function DeviceIcon({ userAgent }: { userAgent: string }) {
  const isMobile = userAgent.includes('Mobile') || 
                   userAgent.includes('Android') || 
                   userAgent.includes('iPhone');
  
  if (isMobile) {
    return (
      <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  
  return (
    <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * Coin icon for balance display
 * Requirements: 6.3
 */
function CoinIcon() {
  return (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
    </svg>
  );
}
