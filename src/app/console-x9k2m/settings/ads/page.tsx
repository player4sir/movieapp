'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AdFormModal, type Ad, type AdFormData } from '@/components/admin/AdFormModal';

/**
 * Admin Ad Management Page
 * Enhanced with batch operations, preview, and inline stats
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export default function AdminAdsPage() {
  const { getAccessToken } = useAdminAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const hasFetched = useRef(false);

  const fetchAds = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/ads', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAds(data.data || []);
      } else {
        setError('加载广告列表失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error('Fetch ads error:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAds();
  }, [fetchAds]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === ads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ads.map(ad => ad.id)));
    }
  };

  // Batch operations
  const handleBatchEnable = async (enable: boolean) => {
    const token = getAccessToken();
    if (!token || selectedIds.size === 0) return;

    setBatchProcessing(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/ads/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ enabled: enable }),
        })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      hasFetched.current = false;
      setLoading(true);
      fetchAds();
    } catch {
      setError('批量操作失败');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    const token = getAccessToken();
    if (!token || selectedIds.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个广告吗？`)) return;

    setBatchProcessing(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/ads/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      hasFetched.current = false;
      setLoading(true);
      fetchAds();
    } catch {
      setError('批量删除失败');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleCreate = () => {
    setEditingAd(null);
    setModalOpen(true);
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setModalOpen(true);
  };

  const handleSave = async (data: AdFormData) => {
    const token = getAccessToken();
    if (!token) return;

    const body = {
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    };

    const url = editingAd ? `/api/admin/ads/${editingAd.id}` : '/api/admin/ads';
    const method = editingAd ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json()) as { message?: string };
      throw new Error(err.message || '保存失败');
    }

    setModalOpen(false);
    hasFetched.current = false;
    setLoading(true);
    fetchAds();
  };

  const handleDelete = async (id: string) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setAds(prev => prev.filter(ad => ad.id !== id));
      } else {
        const err = (await res.json()) as { message?: string };
        setError(err.message || '删除失败');
      }
    } catch (err) {
      setError('删除失败');
      console.error('Delete ad error:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getAdStatus = (ad: Ad): { label: string; color: string } => {
    if (ad.deleted) return { label: '已删除', color: 'text-red-500 bg-red-500/10' };
    if (!ad.enabled) return { label: '已禁用', color: 'text-gray-500 bg-gray-500/10' };

    const now = new Date();
    const startDate = new Date(ad.startDate);
    const endDate = new Date(ad.endDate);

    if (now < startDate) return { label: '未开始', color: 'text-yellow-500 bg-yellow-500/10' };
    if (now > endDate) return { label: '已过期', color: 'text-orange-500 bg-orange-500/10' };
    return { label: '投放中', color: 'text-green-500 bg-green-500/10' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  // Calculate summary stats
  const stats = {
    total: ads.length,
    active: ads.filter(ad => !ad.deleted && ad.enabled && new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate)).length,
    impressions: ads.reduce((sum, ad) => sum + ad.impressions, 0),
    clicks: ads.reduce((sum, ad) => sum + ad.clicks, 0),
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">广告管理</h1>
        <div className="flex items-center gap-2">
          <Link href="/console-x9k2m/settings/ads/slots" className="btn-secondary px-3 py-2 text-sm">
            广告位
          </Link>
          <Link href="/console-x9k2m/settings/ads/stats" className="btn-secondary px-3 py-2 text-sm">
            统计
          </Link>
          <button onClick={handleCreate} className="btn-primary px-4 py-2 text-sm">
            添加
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {!loading && ads.length > 0 && (
        <div className="flex gap-4 mb-4 text-sm">
          <span className="px-3 py-1 bg-surface rounded">总计: <strong>{stats.total}</strong></span>
          <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded">投放中: <strong>{stats.active}</strong></span>
          <span className="px-3 py-1 bg-surface rounded">曝光: <strong>{stats.impressions.toLocaleString()}</strong></span>
          <span className="px-3 py-1 bg-surface rounded">点击: <strong>{stats.clicks.toLocaleString()}</strong></span>
        </div>
      )}

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 rounded-lg">
          <span className="text-sm">已选 <strong>{selectedIds.size}</strong> 项</span>
          <button
            onClick={() => handleBatchEnable(true)}
            disabled={batchProcessing}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            启用
          </button>
          <button
            onClick={() => handleBatchEnable(false)}
            disabled={batchProcessing}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            禁用
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={batchProcessing}
            className="btn-secondary px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
          >
            删除
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-foreground/50 hover:text-foreground"
          >
            取消选择
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg">
          <svg className="w-12 h-12 mx-auto text-foreground/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-foreground/50">暂无广告</p>
          <button onClick={handleCreate} className="btn-primary px-4 py-2 text-sm mt-4">
            添加第一个广告
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2 py-1">
            <input
              type="checkbox"
              checked={selectedIds.size === ads.length && ads.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-xs text-foreground/50">全选</span>
          </div>

          {ads.map(ad => {
            const status = getAdStatus(ad);
            return (
              <div key={ad.id} className={`bg-surface rounded-lg p-3 ${selectedIds.has(ad.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(ad.id)}
                    onChange={() => toggleSelect(ad.id)}
                    className="w-4 h-4 rounded border-border accent-primary flex-shrink-0"
                  />

                  {/* Ad Image - Clickable for Preview */}
                  <div
                    className="w-20 h-12 bg-surface-secondary rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewAd(ad)}
                    title="点击预览"
                  >
                    {ad.imageUrl ? (
                      <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/30">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Ad Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{ad.title}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-foreground/50 mt-0.5">
                      <span>{formatDate(ad.startDate)} - {formatDate(ad.endDate)}</span>
                      <span>展示 {ad.impressions}</span>
                      <span>点击 {ad.clicks}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(ad)}
                      className="p-1.5 rounded hover:bg-surface-secondary text-foreground/60 hover:text-foreground"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(ad.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-foreground/60 hover:text-red-500"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ad Form Modal */}
      <AdFormModal
        isOpen={modalOpen}
        ad={editingAd}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Preview Modal */}
      {previewAd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewAd(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewAd(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              ✕ 关闭
            </button>
            <div className="bg-surface rounded-lg overflow-hidden">
              {previewAd.imageUrl && (
                <img src={previewAd.imageUrl} alt={previewAd.title} className="w-full" />
              )}
              <div className="p-4">
                <h3 className="font-medium mb-1">{previewAd.title}</h3>
                <p className="text-sm text-foreground/50 truncate">{previewAd.targetUrl}</p>
                <div className="flex gap-4 mt-2 text-xs text-foreground/60">
                  <span>展示: {previewAd.impressions.toLocaleString()}</span>
                  <span>点击: {previewAd.clicks.toLocaleString()}</span>
                  <span>CTR: {previewAd.ctr.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-lg p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-foreground/60 text-sm mb-4">确定要删除这个广告吗？此操作不可撤销。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 py-2">取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-primary bg-red-500 hover:bg-red-600 flex-1 py-2">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
