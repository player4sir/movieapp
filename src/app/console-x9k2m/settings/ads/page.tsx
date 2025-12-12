'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AdFormModal, type Ad, type AdFormData } from '@/components/admin/AdFormModal';

/**
 * Admin Ad Management Page
 * List ads with status, impressions, clicks
 * Add/Edit/Delete ad functionality
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
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">广告管理</h1>
        <div className="flex items-center gap-2">
          <Link href="/console-x9k2m/settings/ads/slots" className="btn-secondary px-4 py-2 text-sm">
            广告位管理
          </Link>
          <Link href="/console-x9k2m/settings/ads/stats" className="btn-secondary px-4 py-2 text-sm">
            统计数据
          </Link>
          <button onClick={handleCreate} className="btn-primary px-4 py-2 text-sm">
            添加广告
          </button>
        </div>
      </div>

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
        <div className="space-y-3">
          {ads.map(ad => {
            const status = getAdStatus(ad);
            return (
              <div key={ad.id} className="bg-surface rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {/* Ad Image Preview */}
                  <div className="w-24 h-16 bg-surface-secondary rounded overflow-hidden flex-shrink-0">
                    {ad.imageUrl ? (
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/30">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Ad Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{ad.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/50 truncate mb-2">{ad.targetUrl}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/60">
                      <span>展示: {ad.impressions.toLocaleString()}</span>
                      <span>点击: {ad.clicks.toLocaleString()}</span>
                      <span>CTR: {ad.ctr.toFixed(2)}%</span>
                      <span>优先级: {ad.priority}</span>
                    </div>
                    <div className="text-xs text-foreground/40 mt-1">
                      {formatDate(ad.startDate)} - {formatDate(ad.endDate)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(ad)}
                      className="p-2 rounded-lg hover:bg-surface-secondary text-foreground/60 hover:text-foreground"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(ad.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-foreground/60 hover:text-red-500"
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
