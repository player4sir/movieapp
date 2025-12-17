'use client';

/**
 * Change Password Modal
 * Allows users to change their password
 */

import { useState } from 'react';
import { useAuth } from '@/hooks';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const { getAccessToken, logout } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        setError(null);

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('请填写所有字段');
            return;
        }

        if (newPassword.length < 6) {
            setError('新密码至少6个字符');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        const token = getAccessToken();
        if (!token) {
            setError('请先登录');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '修改失败');
            }

            setSuccess(true);
            // Logout after 2 seconds
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : '修改失败');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (success) return; // Don't close if waiting for logout
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
            onClick={handleClose}
        >
            <div
                className="bg-background rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">修改密码</h2>
                    <button onClick={handleClose} className="p-1 text-foreground/50 hover:text-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-medium mb-2">修改成功</h3>
                        <p className="text-foreground/60">正在跳转到登录页...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">当前密码</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="input"
                                placeholder="请输入当前密码"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">新密码</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="input"
                                placeholder="至少6个字符"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-foreground/60 mb-1">确认新密码</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="input"
                                placeholder="再次输入新密码"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleClose}
                                className="btn-secondary flex-1 py-2.5"
                                disabled={loading}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="btn-primary flex-1 py-2.5 disabled:opacity-50"
                            >
                                {loading ? '提交中...' : '确认修改'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChangePasswordModal;
