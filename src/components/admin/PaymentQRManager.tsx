'use client';

/**
 * PaymentQRManager Component
 * Upload and manage QR codes
 * Enable/disable QR codes
 * 
 * Requirements: 7.2, 7.4
 */

import { useState, useEffect, useCallback } from 'react';
import { TableSkeleton, NetworkError } from './index';

type PaymentType = 'wechat' | 'alipay';

interface PaymentQRCode {
  id: string;
  paymentType: PaymentType;
  imageUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentQRManagerProps {
  getAccessToken: () => string | null;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const PAYMENT_TYPE_CONFIG: Record<PaymentType, { label: string; color: string; bgColor: string }> = {
  wechat: { label: '微信支付', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  alipay: { label: '支付宝', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
};


export function PaymentQRManager({
  getAccessToken,
  onShowToast,
}: PaymentQRManagerProps) {
  const [qrcodes, setQrcodes] = useState<PaymentQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQR, setEditingQR] = useState<PaymentQRCode | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    paymentType: 'wechat' as PaymentType,
    imageUrl: '',
    enabled: true,
  });

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  }, [onShowToast]);

  const fetchQRCodes = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/membership/qrcodes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('获取收款码列表失败');
      }

      const result = await response.json();
      setQrcodes(result.data || []);
    } catch (err) {
      console.error('Failed to fetch qrcodes:', err);
      setError(err instanceof Error ? err.message : '获取收款码失败');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  const handleCreate = () => {
    setEditingQR(null);
    setFormData({
      paymentType: 'wechat',
      imageUrl: '',
      enabled: true,
    });
    setShowForm(true);
  };

  const handleEdit = (qr: PaymentQRCode) => {
    setEditingQR(qr);
    setFormData({
      paymentType: qr.paymentType,
      imageUrl: qr.imageUrl,
      enabled: qr.enabled,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const token = getAccessToken();
    if (!token) return;

    if (!formData.imageUrl.trim()) {
      showToast('请输入收款码图片URL', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingQR 
        ? `/api/admin/membership/qrcodes/${editingQR.id}`
        : '/api/admin/membership/qrcodes';
      
      const response = await fetch(url, {
        method: editingQR ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '保存失败');
      }

      showToast(editingQR ? '收款码已更新' : '收款码已添加', 'success');
      setShowForm(false);
      fetchQRCodes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (qr: PaymentQRCode) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/membership/qrcodes/${qr.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !qr.enabled }),
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      showToast(qr.enabled ? '收款码已禁用' : '收款码已启用', 'success');
      fetchQRCodes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const handleDelete = async (qr: PaymentQRCode) => {
    if (!confirm('确定删除此收款码？')) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/membership/qrcodes/${qr.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      showToast('收款码已删除', 'success');
      fetchQRCodes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  if (loading && qrcodes.length === 0) {
    return <TableSkeleton rows={2} columns={3} />;
  }

  if (error && qrcodes.length === 0) {
    return <NetworkError message={error} type="network" onRetry={fetchQRCodes} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">收款码管理</h3>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          添加收款码
        </button>
      </div>

      {/* QR Codes Grid */}
      {qrcodes.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg">
          <p className="text-foreground/50">暂无收款码，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qrcodes.map(qr => {
            const typeConfig = PAYMENT_TYPE_CONFIG[qr.paymentType];
            return (
              <div
                key={qr.id}
                className={`bg-surface rounded-lg p-4 ${!qr.enabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    {!qr.enabled && (
                      <span className="px-2 py-0.5 text-xs bg-foreground/10 text-foreground/50 rounded">
                        已禁用
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleEnabled(qr)}
                      className={`px-2 py-1 text-xs rounded ${
                        qr.enabled 
                          ? 'text-red-500 hover:bg-red-500/10' 
                          : 'text-green-500 hover:bg-green-500/10'
                      }`}
                    >
                      {qr.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleEdit(qr)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(qr)}
                      className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <img
                  src={qr.imageUrl}
                  alt={typeConfig.label}
                  className="w-full h-48 object-contain bg-surface-secondary rounded-lg"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50"
          onClick={() => setShowForm(false)}
        >
          <div 
            className="bg-background rounded-t-xl lg:rounded-lg w-full lg:max-w-md max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-secondary">
              <h3 className="text-lg font-semibold">
                {editingQR ? '编辑收款码' : '添加收款码'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-foreground/50 hover:text-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm text-foreground/70 mb-1">支付类型</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as PaymentType }))}
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                >
                  <option value="wechat">微信支付</option>
                  <option value="alipay">支付宝</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-1">图片URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                />
              </div>

              {formData.imageUrl && (
                <div>
                  <label className="block text-sm text-foreground/70 mb-1">预览</label>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-48 object-contain bg-surface-secondary rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="qr-enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="qr-enabled" className="text-sm">启用收款码</label>
              </div>
            </div>

            <div className="p-4 border-t border-surface-secondary">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentQRManager;
