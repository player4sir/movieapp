'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';

import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  FilterPanel,
  BatchOperationBar,
  useToast,
  ToastProvider,
  UserDetailModal,
  UserEditModal,
  UserListSkeleton,
  NetworkError,
  GroupFormModal,
  UserCreateModal,
} from '@/components/admin';
import type { UserListParams } from '@/components/admin';
import type { UserGroupSummary } from '@/types/admin';
import type { MemberLevel } from '@/types/auth';

interface User {
  id: string;
  username: string;
  nickname: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  memberLevel: MemberLevel;
  memberExpiry: string | null;
  groupId: string | null;
  group?: UserGroupSummary | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: GroupPermissions;
  createdAt: string;
  _count: { users: number };
}

interface GroupPermissions {
  memberLevel?: MemberLevel;
  canWatch?: boolean;
  canDownload?: boolean;
  maxFavorites?: number;
  adFree?: boolean;
}

function AdminUsersPageContent() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold mb-4">用户管理</h1>
      <UsersTab />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ToastProvider>
      <AdminUsersPageContent />
    </ToastProvider>
  );
}

// ==================== Users Tab ====================
function UsersTab() {
  const { getAccessToken } = useAdminAuth();
  const { showToast } = useToast();

  // Filters state (controlled by FilterPanel) - Must be declared before activeFilterCount
  const [filters, setFilters] = useState<UserListParams>({ page: 1, pageSize: 15 });

  // Restore necessary states
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User detail modal state (Requirements 3.1, 5.2)
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create user modal state (Requirements 5.1)
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Batch selection state (Requirements 2.1)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Group management modal state (Requirements 1.1, 1.2)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [showGroupList, setShowGroupList] = useState(false);

  // Calculate active filter count for FilterPanel
  const activeFilterCount = [
    filters.search,
    filters.status,
    filters.memberLevel,
    filters.groupId,
  ].filter(Boolean).length;
  // SWR Fetcher
  const usersFetcher = async (url: string) => {
    const token = getAccessToken();
    if (!token) throw new Error('No token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('获取失败');
    const data = await res.json();
    return data;
  };

  // Construct query string for SWR key
  const queryParams = new URLSearchParams({
    page: (filters.page || 1).toString(),
    pageSize: (filters.pageSize || 15).toString()
  });
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.memberLevel) queryParams.set('memberLevel', filters.memberLevel);
  if (filters.groupId) queryParams.set('groupId', filters.groupId);

  const { data: usersData, error: swrError, isLoading: swrLoading, mutate } = useSWR<{ data: User[], pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
    `/api/admin/users?${queryParams}`,
    usersFetcher,
    {
      keepPreviousData: true, // IMPORTANT: Prevents flashing when changing pages/filters
      dedupingInterval: 5000
    }
  );

  const users = useMemo(() => usersData?.data || [], [usersData]);
  const pagination = usersData?.pagination || { page: 1, total: 0, totalPages: 0 };
  const loading = swrLoading;
  const error = swrError instanceof Error ? swrError.message : (swrError ? '获取失败' : null);

  // Wrapper to compatible with existing code structure, triggering revalidation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchUsers = useCallback((_page = 1) => {
    // Usually SWR handles this automatically via filter change, 
    // but for manual refresh (e.g. after edit), we call mutate()
    mutate();
  }, [mutate]);

  const fetchGroups = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch('/api/admin/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  // useEffect(() => { fetchUsers(filters.page || 1); }, [fetchUsers, filters.page]); // Handled by SWR

  // Helper: fetch with auth token
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getAccessToken();
    if (!token) throw new Error('未登录');

    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    // If token expired, redirect to login
    if (res.status === 401) {
      window.location.href = '/console-x9k2m/login';
      throw new Error('登录已过期，请重新登录');
    }

    return res;
  }, [getAccessToken]);

  // Group management handlers (Requirements 1.2, 1.4)
  const handleSaveGroup = async (data: Partial<UserGroup>) => {
    try {
      const url = editingGroup ? `/api/admin/groups/${editingGroup.id}` : '/api/admin/groups';
      const res = await fetchWithAuth(url, {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '保存失败');
      }
      showToast({ message: editingGroup ? '用户组已更新' : '用户组已创建', type: 'success' });
      fetchGroups();
      fetchUsers(pagination.page);
      setIsGroupModalOpen(false);
      setEditingGroup(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : '保存失败';
      showToast({ message, type: 'error' });
      throw e;
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('删除用户组？组内用户将被移出。')) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await fetch(`/api/admin/groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast({ message: '用户组已删除', type: 'success' });
      fetchGroups();
      fetchUsers(pagination.page);
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除失败';
      showToast({ message, type: 'error' });
    }
  };

  const handleManageGroups = useCallback(() => {
    setShowGroupList(true);
  }, []);

  // Handle filter changes (Requirements 4.1, 4.2)
  const handleFilterChange = useCallback((newFilters: UserListParams) => {
    setFilters(newFilters);
    setSelectedUserIds(new Set()); // Clear selection on filter change
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ page: 1, pageSize: 15 });
    setSelectedUserIds(new Set());
  }, []);

  // Selection handlers (Requirements 2.1)
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  }, [users, selectedUserIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedUserIds(new Set());
    setIsSelectMode(false);
  }, []);

  // Batch operation handlers (Requirements 2.2, 2.3, 2.4)
  const executeBatchOperation = useCallback(async (
    operation: string,
    payload: Record<string, unknown>
  ) => {
    const token = getAccessToken();
    if (!token || selectedUserIds.size === 0) return;

    try {
      const res = await fetch('/api/admin/users/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          operation,
          payload,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast({
          message: `操作成功：${data.affected} 个用户已更新`,
          type: 'success'
        });
        fetchUsers(pagination.page);
        handleClearSelection();
      } else {
        throw new Error(data.message || '操作失败');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失败';
      showToast({ message, type: 'error' });
    }
  }, [getAccessToken, selectedUserIds, pagination.page, fetchUsers, handleClearSelection, showToast]);

  const handleBatchStatusChange = useCallback((status: 'active' | 'disabled') => {
    executeBatchOperation('updateStatus', { status });
  }, [executeBatchOperation]);

  const handleBatchGroupChange = useCallback((groupId: string | null) => {
    executeBatchOperation('updateGroup', { groupId });
  }, [executeBatchOperation]);

  const handleBatchMemberLevelChange = useCallback((memberLevel: MemberLevel) => {
    executeBatchOperation('updateMemberLevel', { memberLevel });
  }, [executeBatchOperation]);

  const handleUpdateUser = async (userId: string, data: Record<string, unknown>) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('更新失败');
      showToast({ message: '用户更新成功', type: 'success' });
      fetchUsers(pagination.page);
      setEditingUser(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新失败';
      showToast({ message, type: 'error' });
    }
  };

  const handleCreateUser = async (data: Record<string, unknown>) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '创建失败');
      }
      // Create user success handled by modal callback
    } catch (e) {
      console.error(e);
      throw e; // Re-throw to be handled by modal
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定删除该用户？')) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast({ message: '用户已删除', type: 'success' });
      fetchUsers(pagination.page);
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除失败';
      showToast({ message, type: 'error' });
    }
  };

  // Convert groups to UserGroupSummary for components
  const groupSummaries: UserGroupSummary[] = groups.map(g => ({
    id: g.id,
    name: g.name,
    color: g.color,
  }));

  return (
    <>
      {/* Fixed Header - Filter + Toolbar */}
      <div className="sticky top-0 z-10 bg-background pb-2">
        {/* Filter Panel */}
        <div className="mb-3">
          <FilterPanel
            filters={filters}
            groups={groupSummaries}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            activeCount={activeFilterCount}
            onManageGroups={handleManageGroups}
          />
        </div>

        {/* Toolbar: Selection mode + actions */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建
            </button>
            <button
              onClick={() => setIsSelectMode(!isSelectMode)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${isSelectMode
                ? 'bg-primary text-white'
                : 'bg-surface-secondary text-foreground/70 hover:text-foreground'
                }`}
            >
              {isSelectMode ? '退出' : '批量'}
            </button>
            {isSelectMode && users.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary hover:underline"
              >
                {selectedUserIds.size === users.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>
          <span className="text-xs text-foreground/50">
            {pagination.total} 用户
          </span>
        </div>
      </div>

      {/* Error State with Retry (Requirements 5.5) */}
      {error && !loading && users.length > 0 && (
        <NetworkError
          message={error}
          type="network"
          compact
          onRetry={() => fetchUsers(filters.page || 1)}
          className="mb-4"
        />
      )}

      {/* User List */}
      {loading ? (
        /* Loading Skeleton (Requirements 5.3) */
        <UserListSkeleton count={8} showCheckbox={isSelectMode} />
      ) : error && users.length === 0 ? (
        /* Full Error State when no data */
        <NetworkError
          message={error}
          type="network"
          onRetry={() => fetchUsers(filters.page || 1)}
        />
      ) : users.length === 0 ? (
        <div className="bg-surface rounded-lg overflow-hidden">
          <div className="p-12 flex flex-col items-center justify-center text-foreground/50">
            <svg className="w-16 h-16 mb-4 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-lg font-medium mb-1">暂无用户</p>
            <p className="text-sm mb-4">当前尚未创建任何用户</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary px-4 py-2"
            >
              新建第一个用户
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-lg overflow-hidden border border-border/50">
          {/* Desktop Table View - Compact Design */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary/50 text-foreground/60 text-xs font-medium border-b border-border/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8">
                    {isSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded border-foreground/30 text-primary focus:ring-primary"
                      />
                    )}
                  </th>
                  <th className="px-3 py-2">用户</th>
                  <th className="px-3 py-2">用户组</th>
                  <th className="px-3 py-2 w-16 text-center">等级</th>
                  <th className="px-3 py-2 w-16 text-center">状态</th>
                  <th className="px-3 py-2 w-24">最后登录</th>
                  <th className="px-3 py-2 w-16 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {users.map((user) => (
                  <tr
                    key={`table-${user.id}`}
                    onClick={() => {
                      if (isSelectMode) handleSelectUser(user.id);
                      else {
                        setDetailUserId(user.id);
                        setIsDetailOpen(true);
                      }
                    }}
                    className={`hover:bg-surface-secondary/30 transition-colors cursor-pointer ${selectedUserIds.has(user.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      {isSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-3.5 h-3.5 rounded border-foreground/30 text-primary focus:ring-primary"
                          disabled={user.role === 'admin'}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-foreground/60 flex-shrink-0">
                          {(user.nickname || user.username)?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{user.username}</span>
                            {user.role === 'admin' && (
                              <span className="bg-primary/15 text-primary px-1 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0">
                                Admin
                              </span>
                            )}
                          </div>
                          {user.nickname && user.nickname !== user.username && (
                            <div className="text-xs text-foreground/40 truncate">{user.nickname}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {user.group ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${user.group.color}15`, color: user.group.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.group.color }}></span>
                          {user.group.name}
                        </span>
                      ) : <span className="text-foreground/20 text-xs">-</span>}
                    </td>
                    <td className="px-3 py-2 text-center"><MemberBadge level={user.memberLevel} /></td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} title={user.status === 'active' ? '正常' : '禁用'}></span>
                    </td>
                    <td className="px-3 py-2 text-foreground/40 text-xs">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!isSelectMode && (
                        <div className="flex justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="编辑"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="删除"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-surface-secondary/50">
            {users.map((user) => (
              <div
                key={`card-${user.id}`}
                onClick={(e) => {
                  if (isSelectMode || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                  setDetailUserId(user.id);
                  setIsDetailOpen(true);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer ${selectedUserIds.has(user.id) ? 'bg-primary/5' : 'hover:bg-surface-secondary/30'}`}
              >
                {/* Checkbox */}
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="w-4 h-4 rounded border-foreground/30 text-primary focus:ring-primary flex-shrink-0"
                    disabled={user.role === 'admin'}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-foreground/60 flex-shrink-0">
                  {(user.nickname || user.username)?.[0]?.toUpperCase() || 'U'}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium text-sm truncate">{user.username}</span>
                    {user.role === 'admin' && (
                      <span className="bg-primary/15 text-primary px-1 py-0.5 rounded text-[8px] font-bold uppercase flex-shrink-0">Admin</span>
                    )}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                    {user.nickname && user.nickname !== user.username && (
                      <span className="truncate max-w-[80px]">{user.nickname}</span>
                    )}
                    <MemberBadge level={user.memberLevel} />
                    {user.group && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${user.group.color}20`, color: user.group.color }}>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: user.group.color }}></span>
                        {user.group.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isSelectMode && (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-1.5 text-foreground/30 hover:text-primary rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 text-foreground/30 hover:text-red-500 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-foreground/50">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
              disabled={pagination.page <= 1}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )
      }

      {/* Batch Operation Bar (Requirements 2.1, 5.1) */}
      <BatchOperationBar
        selectedCount={selectedUserIds.size}
        onClear={handleClearSelection}
        onStatusChange={handleBatchStatusChange}
        onGroupChange={handleBatchGroupChange}
        onMemberLevelChange={handleBatchMemberLevelChange}
        groups={groupSummaries}
      />

      {/* Create User Modal (Requirements 5.1) */}
      <UserCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        groups={groupSummaries}
        onSave={handleCreateUser}
        onUserCreated={() => fetchUsers(1)} // Refresh list from page 1
      />

      {/* Edit Modal (Requirements 3.2, 5.2) */}
      <UserEditModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        groups={groupSummaries}
        onSave={async (userId, data) => {
          await handleUpdateUser(userId, data);
        }}
        onUserUpdated={() => fetchUsers(pagination.page)}
      />

      {/* User Detail Modal (Requirements 3.1, 5.2, 6.1, 6.2, 6.3) */}
      <UserDetailModal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setDetailUserId(null); }}
        userId={detailUserId}
        getAccessToken={getAccessToken}
        onEdit={(userId) => {
          setIsDetailOpen(false);
          const user = users.find(u => u.id === userId);
          if (user) setEditingUser(user);
        }}
        onShowToast={(message, type) => showToast({ message, type })}
      />

      {/* Group Management Modal (Requirements 1.1, 1.2) */}
      <GroupFormModal
        isOpen={isGroupModalOpen}
        group={editingGroup}
        onClose={() => { setIsGroupModalOpen(false); setEditingGroup(null); }}
        onSave={handleSaveGroup}
      />

      {/* Group List Modal (Requirements 1.1) */}
      {
        showGroupList && (
          <div
            className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50"
            onClick={() => setShowGroupList(false)}
          >
            <div
              className="bg-background rounded-t-xl lg:rounded-lg p-5 w-full lg:max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">用户组管理</h2>
                <button
                  onClick={() => { setShowGroupList(false); setEditingGroup(null); setIsGroupModalOpen(true); }}
                  className="btn-primary px-3 py-1.5 text-sm"
                >
                  新建
                </button>
              </div>

              {groups.length === 0 ? (
                <p className="text-center py-8 text-foreground/50">暂无用户组</p>
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => (
                    <div key={g.id} className="p-3 bg-surface rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: g.color }}
                        />
                        <span className="font-medium flex-1">{g.name}</span>
                        <span className="text-xs text-foreground/50">{g._count.users} 人</span>
                      </div>
                      {g.description && (
                        <p className="text-sm text-foreground/60 mb-2 line-clamp-1">{g.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {g.permissions.memberLevel && (
                          <span className="px-1.5 py-0.5 bg-surface-secondary text-foreground/60 text-xs rounded">
                            会员: {g.permissions.memberLevel.toUpperCase()}
                          </span>
                        )}
                        {g.permissions.adFree && (
                          <span className="px-1.5 py-0.5 bg-surface-secondary text-foreground/60 text-xs rounded">免广告</span>
                        )}
                        {g.permissions.canDownload && (
                          <span className="px-1.5 py-0.5 bg-surface-secondary text-foreground/60 text-xs rounded">可下载</span>
                        )}
                      </div>
                      <div className="flex gap-2 text-sm">
                        <button
                          onClick={() => { setShowGroupList(false); setEditingGroup(g); setIsGroupModalOpen(true); }}
                          className="text-primary hover:underline"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(g.id)}
                          className="text-red-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowGroupList(false)}
                className="w-full mt-4 py-2.5 btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        )
      }
    </>
  );
}


// ==================== Helper Components ====================
function MemberBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    free: 'text-foreground/50',
    vip: 'text-yellow-600',
    svip: 'text-purple-500'
  };
  const labels: Record<string, string> = {
    free: '免费',
    vip: 'VIP',
    svip: 'SVIP'
  };
  return <span className={`text-xs ${styles[level]}`}>{labels[level]}</span>;
}
