'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface SiteSettingsData {
    site_name: string;
    site_description: string;
    site_logo: string;
    site_copyright: string;
}

const DEFAULT_SETTINGS: SiteSettingsData = {
    site_name: '影视流媒体',
    site_description: '移动端影视流媒体应用，提供影视内容浏览、搜索、播放功能',
    site_logo: '',
    site_copyright: '© 2024 影视流媒体',
};

export default function SiteSettingsPage() {
    const [settings, setSettings] = useState<SiteSettingsData>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/admin/site-settings');
                if (response.ok) {
                    const data = await response.json();
                    setSettings(data);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = useCallback((field: keyof SiteSettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setMessage(null);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/site-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setMessage({ type: 'success', text: '设置已保存' });
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.message || '保存失败' });
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: '保存失败，请重试' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 lg:p-8 max-w-3xl mx-auto">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/console-x9k2m/settings"
                    className="p-2 -ml-2 text-foreground/60 hover:text-foreground rounded-lg hover:bg-surface-secondary/50"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">站点设置</h1>
                    <p className="text-sm text-foreground/50">配置站点名称、描述、Logo 等基本信息</p>
                </div>
            </div>

            {/* Settings Form */}
            <div className="space-y-6 bg-surface rounded-2xl p-6">
                {/* Site Name */}
                <div>
                    <label className="block text-sm font-medium mb-2">站点名称</label>
                    <input
                        type="text"
                        value={settings.site_name}
                        onChange={(e) => handleChange('site_name', e.target.value)}
                        placeholder="输入站点名称"
                        className="w-full px-4 py-3 bg-background border border-surface-secondary rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <p className="text-xs text-foreground/40 mt-1">显示在侧边栏、页面标题等位置</p>
                </div>

                {/* Site Description */}
                <div>
                    <label className="block text-sm font-medium mb-2">站点描述</label>
                    <textarea
                        value={settings.site_description}
                        onChange={(e) => handleChange('site_description', e.target.value)}
                        placeholder="输入站点描述"
                        rows={3}
                        className="w-full px-4 py-3 bg-background border border-surface-secondary rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    />
                    <p className="text-xs text-foreground/40 mt-1">用于 SEO meta 描述</p>
                </div>

                {/* Site Logo */}
                <div>
                    <label className="block text-sm font-medium mb-2">Logo URL</label>
                    <input
                        type="url"
                        value={settings.site_logo}
                        onChange={(e) => handleChange('site_logo', e.target.value)}
                        placeholder="https://example.com/logo.png (可选)"
                        className="w-full px-4 py-3 bg-background border border-surface-secondary rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <p className="text-xs text-foreground/40 mt-1">留空使用默认 Logo</p>
                </div>

                {/* Copyright */}
                <div>
                    <label className="block text-sm font-medium mb-2">版权信息</label>
                    <input
                        type="text"
                        value={settings.site_copyright}
                        onChange={(e) => handleChange('site_copyright', e.target.value)}
                        placeholder="© 2024 影视流媒体"
                        className="w-full px-4 py-3 bg-background border border-surface-secondary rounded-xl text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <p className="text-xs text-foreground/40 mt-1">显示在页脚位置</p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl ${message.type === 'success'
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-red-500/10 text-red-600'
                        }`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="text-sm">{message.text}</span>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-surface-secondary">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? '保存中...' : '保存设置'}
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-surface rounded-2xl p-6">
                <h2 className="text-sm font-bold text-foreground/40 uppercase tracking-wider mb-4">预览效果</h2>
                <div className="bg-background rounded-xl p-4 border border-surface-secondary">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                            {settings.site_logo ? (
                                <img src={settings.site_logo} alt="Logo" className="w-6 h-6 object-contain" />
                            ) : (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                            )}
                        </div>
                        <span className="text-lg font-bold">{settings.site_name || '站点名称'}</span>
                    </div>
                    <p className="text-sm text-foreground/60 mb-4">{settings.site_description || '站点描述'}</p>
                    <p className="text-xs text-foreground/40 border-t border-surface-secondary pt-4">
                        {settings.site_copyright || '版权信息'}
                    </p>
                </div>
            </div>
        </div>
    );
}
