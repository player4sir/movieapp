'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import type { UserGroupSummary } from '@/types/admin';
import type { MemberLevel } from '@/types/auth';

export interface UserCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: UserGroupSummary[];
    onSave: (data: Record<string, unknown>) => Promise<void>;
    onUserCreated?: () => void;
}

/**
 * User Create Modal Component
 * Modal for creating a new user
 * Requirements: 5.1, 5.2
 */
export function UserCreateModal({
    isOpen,
    onClose,
    groups,
    onSave,
    onUserCreated,
}: UserCreateModalProps) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({
        username: '',
        password: '',
        nickname: '',
        status: 'active' as 'active' | 'disabled',
        memberLevel: 'free' as MemberLevel,
        groupId: '',
    });

    // Handle create user
    const handleSave = async () => {
        // Validation
        if (!form.username.trim()) {
            showToast({ message: '请输入用户名', type: 'error' });
            return;
        }
        if (!form.password || form.password.length < 6) {
            showToast({ message: '密码至少 6 位', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            await onSave({
                username: form.username.trim(),
                password: form.password,
                nickname: form.nickname.trim(),
                status: form.status,
                memberLevel: form.memberLevel,
                groupId: form.groupId || null,
            });
            showToast({ message: '用户创建成功', type: 'success' });

            // Reset form
            setForm({
                username: '',
                password: '',
                nickname: '',
                status: 'active',
                memberLevel: 'free',
                groupId: '',
            });

            onUserCreated?.();
            onClose();
        } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '创建失败', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

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
                    <h2 className="text-lg font-semibold">新建用户</h2>
                    <button onClick={onClose} className="p-1 text-foreground/50 hover:text-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">用户名 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            className="input font-mono"
                            placeholder="登录用户名"
                            autoComplete="off"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">密码 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="input font-mono"
                            placeholder="至少 6 位字符"
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Nickname */}
                    <div>
                        <label className="block text-sm text-foreground/60 mb-1">昵称</label>
                        <input
                            type="text"
                            value={form.nickname}
                            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                            className="input"
                            placeholder="显示名称（选填）"
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
                            {saving ? '创建中...' : '创建'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
