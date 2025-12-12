'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { SourceCategory } from '@/types/admin';
import Link from 'next/link';

interface VideoSource {
    id: string;
    name: string;
    category: SourceCategory;
    enabled: boolean;
}

interface ResourceItem {
    vod_id: number;
    vod_name: string;
    type_name: string;
    vod_time: string;
    vod_remarks: string;
    vod_pic?: string;
    vod_play_from?: string;
}

export default function ResourceSettingsPage() {
    const { getAccessToken } = useAdminAuth();

    // State
    const [sources, setSources] = useState<VideoSource[]>([]);
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [typeId] = useState<number | undefined>(undefined);

    const fetchWithAuth = useCallback(async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) {
            window.location.href = '/console-x9k2m/login';
            throw new Error('登录已过期');
        }
        return res;
    }, [getAccessToken]);

    // Load sources on mount
    useEffect(() => {
        const loadSources = async () => {
            try {
                const res = await fetchWithAuth('/api/admin/sources');
                const data = await res.json();
                setSources(data);
                // Default to first enabled source
                const first = data.find((s: VideoSource) => s.enabled) || data[0];
                if (first) setSelectedSourceId(first.id);
            } catch (err) {
                console.error('Failed to load sources', err);
            }
        };
        loadSources();
    }, [fetchWithAuth]);

    // Fetch resources when filters change
    const fetchResources = useCallback(async () => {
        if (!selectedSourceId) return;

        setLoading(true);
        setError(null);
        setResources([]);

        try {
            const params = new URLSearchParams({
                sourceId: selectedSourceId,
                page: page.toString(),
            });

            if (keyword) params.set('wd', keyword);
            if (typeId) params.set('t', typeId.toString());

            const res = await fetchWithAuth(`/api/admin/resources?${params.toString()}`);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '加载失败');
            }

            const data = await res.json();
            setResources(data.list || []);
            setTotalPages(data.pagecount || 1);

            if ((!data.list || data.list.length === 0) && page === 1) {
                setError('未找到相关资源');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载资源失败');
        } finally {
            setLoading(false);
        }
    }, [selectedSourceId, page, keyword, typeId, fetchWithAuth]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchResources();
    };

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Link href="/console-x9k2m/settings" className="text-foreground/50 hover:text-foreground transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-xl font-semibold">资源库浏览</h1>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <select
                        value={selectedSourceId}
                        onChange={(e) => { setSelectedSourceId(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-surface-secondary/30 border-transparent focus:border-primary/20 focus:bg-surface-secondary/50 focus:ring-0 rounded-xl text-sm min-w-[200px]"
                    >
                        {sources.map(source => (
                            <option key={source.id} value={source.id}>
                                {source.name} {source.enabled ? '' : '(已禁用)'} - {source.category === 'normal' ? '常规' : '成人'}
                            </option>
                        ))}
                    </select>

                    <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="搜索资源名称..."
                            className="px-4 py-2.5 bg-surface-secondary/30 border-transparent focus:border-primary/20 focus:bg-surface-secondary/50 focus:ring-0 rounded-xl text-sm w-full sm:w-64"
                        />
                        <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
                            搜索
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border/50 overflow-hidden min-h-[500px] shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-foreground/50">正在加载资源...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="text-foreground/70 font-medium mb-1">{error}</p>
                        <p className="text-xs text-foreground/40 max-w-md">可能是源地址无法访问，或者该源不支持此类查询</p>
                        <button onClick={() => fetchResources()} className="mt-4 text-primary hover:underline text-sm">重试</button>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-foreground/40">暂无数据</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-surface-secondary/50 text-foreground/60 border-b border-border/50">
                                    <tr>
                                        <th className="px-5 py-3 font-medium w-20">ID</th>
                                        <th className="px-5 py-3 font-medium">名称</th>
                                        <th className="px-5 py-3 font-medium">类型</th>
                                        <th className="px-5 py-3 font-medium">更新时间</th>
                                        <th className="px-5 py-3 font-medium">状态/备注</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {resources.map((item) => (
                                        <tr key={item.vod_id} className="hover:bg-surface-secondary/30 transition-colors">
                                            <td className="px-5 py-3 text-foreground/40 font-mono text-xs">{item.vod_id}</td>
                                            <td className="px-5 py-3 font-medium">
                                                <div className="flex items-center gap-3">
                                                    {item.vod_pic && (
                                                        <div className="w-8 h-10 bg-surface-secondary rounded overflow-hidden flex-shrink-0 border border-border/30">
                                                            <img src={item.vod_pic} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                        </div>
                                                    )}
                                                    <span className="text-foreground/90">{item.vod_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-foreground/60">
                                                <span className="bg-surface-secondary/50 px-2 py-0.5 rounded text-xs">
                                                    {item.type_name}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-foreground/50 font-mono text-xs">{item.vod_time}</td>
                                            <td className="px-5 py-3 text-foreground/50 text-xs truncate max-w-[200px]">{item.vod_remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden p-4 space-y-3">
                            {resources.map((item) => (
                                <div key={item.vod_id} className="flex gap-3 bg-surface rounded-xl p-3 border border-border/30 shadow-sm">
                                    {item.vod_pic && (
                                        <div className="w-16 h-20 bg-surface-secondary rounded-lg overflow-hidden flex-shrink-0 border border-border/30">
                                            <img src={item.vod_pic} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h3 className="font-medium text-foreground/90 truncate mb-1">{item.vod_name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-foreground/50">
                                                <span className="bg-surface-secondary/50 px-1.5 py-0.5 rounded">{item.type_name}</span>
                                                <span>{item.vod_remarks}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-foreground/40 mt-2">
                                            <span>ID: {item.vod_id}</span>
                                            <span>{item.vod_time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Pagination */}
                {!loading && !error && resources.length > 0 && (
                    <div className="border-t border-border/50 p-4 flex items-center justify-between bg-surface-secondary/5">
                        <div className="text-xs text-foreground/40">
                            第 {page} 页 / 共 {totalPages} 页
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs bg-surface border border-border/50 rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:hover:bg-surface transition-colors"
                            >
                                上一页
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 text-xs bg-surface border border-border/50 rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:hover:bg-surface transition-colors"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
