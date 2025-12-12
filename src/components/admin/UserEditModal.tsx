'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toast';
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
}

export interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  groups: UserGroupSummary[];
  onSave: (userId: string, data: Record<string, unknown>) => Promise<void>;
  onUserUpdated?: () => void;
}

/**
 * User Edit Modal Component
 * Simplified modal for editing user information
 * Requirements: 3.2, 5.2
 */
export function UserEditModal({
  isOpen,
  onClose,
  user,
  groups,
  onSave,
  onUserUpdated,
}: UserEditModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Form state - simplified to essential fields only
  const [form, setForm] = useState({
    nickname: '',
    status: 'active' as 'active' | 'disabled',
    memberLevel: 'free' as MemberLevel,
    groupId: '',
  });
  const [newPassword, setNewPassword] = useState('');


  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setForm({
        nickname: user.nickname || '',
        status: user.status,
        memberLevel: user.memberLevel,
        groupId: user.groupId || '',
      });
      setNewPassword('');
    }
  }, [user]);

  // Handle save user info (Requirements 3.2)
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await onSave(user.id, {
        nickname: form.nickname,
        status: form.status,
        memberLevel: form.memberLevel,
        groupId: form.groupId || null,
        newPassword: newPassword || undefined,
      });
      showToast({ message: '用户信息已更新', type: 'success' });
      onUserUpdated?.();
      onClose();
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-xl lg:rounded-lg p-5 w-full lg:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">编辑用户</h2>
          <button onClick={onClose} className="p-1 text-foreground/50 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Username (read-only) */}
          <div>
            <label className="block text-sm text-foreground/60 mb-1">用户名</label>
            <p className="font-medium">{user.username}</p>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm text-foreground/60 mb-1">昵称</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="input"
              placeholder="用户昵称"
            />
          </div>

          {/* Status & Member Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-foreground/60 mb-1">状态</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'disabled' })}
                className="input"
                disabled={user.role === 'admin'}
              >
                <option value="active">正常</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/60 mb-1">会员等级</label>
              <select
                value={form.memberLevel}
                onChange={(e) => setForm({ ...form, memberLevel: e.target.value as MemberLevel })}
                className="input"
              >
                <option value="free">免费</option>
                <option value="vip">VIP</option>
                <option value="svip">SVIP</option>
              </select>
            </div>
          </div>

          {/* User Group */}
          <div>
            <label className="block text-sm text-foreground/60 mb-1">用户组</label>
            <select
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              className="input"
            >
              <option value="">无</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <p className="text-xs text-foreground/50 mt-1">用户组可覆盖会员等级和权限</p>
          </div>

          {/* New Password (Reset) - Requirements 3.3, 5.2 */}
          <div className="pt-2 border-t border-surface-secondary">
            <label className="block text-sm text-foreground/60 mb-1">重置密码</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input font-mono text-sm"
              placeholder="输入新密码（留空则不修改）"
              autoComplete="new-password"
            />
            <p className="text-xs text-foreground/50 mt-1">仅在需要重置用户密码时填写</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5"
              disabled={saving}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 py-2.5 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
