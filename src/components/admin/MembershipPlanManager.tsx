'use client';

/**
 * MembershipPlanManager Component
 * CRUD interface for plans
 * Enable/disable plans
 * 
 * Requirements: 7.1
 */

import { useState, useEffect, useCallback } from 'react';
import { TableSkeleton, NetworkError } from './index';

type MemberLevel = 'vip' | 'svip';

interface MembershipPlan {
  id: string;
  name: string;
  memberLevel: MemberLevel;
  duration: number;
  price: number;
  coinPrice: number;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlanManagerProps {
  getAccessToken: () => string | null;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const LEVEL_CONFIG: Record<MemberLevel, { label: string; color: string }> = {
  vip: { label: 'VIP', color: 'text-yellow-500' },
  svip: { label: 'SVIP', color: 'text-purple-400' },
};

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}年`;
  if (days >= 30) return `${Math.floor(days / 30)}个月`;
  return `${days}天`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}


export function MembershipPlanManager({
  getAccessToken,
  onShowToast,
}: MembershipPlanManagerProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    memberLevel: 'vip' as MemberLevel,
    duration: 30,
    price: 0,
    coinPrice: 0,
    enabled: true,
    sortOrder: 0,
  });

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  }, [onShowToast]);

  const fetchPlans = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/membership/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('获取套餐列表失败');
      }

      const result = await response.json();
      setPlans(result.data || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError(err instanceof Error ? err.message : '获取套餐失败');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      memberLevel: 'vip',
      duration: 30,
      price: 0,
      coinPrice: 0,
      enabled: true,
      sortOrder: plans.length,
    });
    setShowForm(true);
  };

  const handleEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      memberLevel: plan.memberLevel,
      duration: plan.duration,
      price: plan.price,
      coinPrice: plan.coinPrice,
      enabled: plan.enabled,
      sortOrder: plan.sortOrder,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const token = getAccessToken();
    if (!token) return;

    if (!formData.name.trim()) {
      showToast('请输入套餐名称', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingPlan 
        ? `/api/admin/membership/plans/${editingPlan.id}`
        : '/api/admin/membership/plans';
      
      const response = await fetch(url, {
        method: editingPlan ? 'PUT' : 'POST',
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

      showToast(editingPlan ? '套餐已更新' : '套餐已创建', 'success');
      setShowForm(false);
      fetchPlans();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (plan: MembershipPlan) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/membership/plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !plan.enabled }),
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      showToast(plan.enabled ? '套餐已禁用' : '套餐已启用', 'success');
      fetchPlans();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const handleDelete = async (plan: MembershipPlan) => {
    if (!confirm(`确定删除套餐 "${plan.name}"？`)) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/membership/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      showToast('套餐已删除', 'success');
      fetchPlans();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  if (loading && plans.length === 0) {
    return <TableSkeleton rows={4} columns={4} />;
  }

  if (error && plans.length === 0) {
    return <NetworkError message={error} type="network" onRetry={fetchPlans} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">会员套餐</h3>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          添加套餐
        </button>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg">
            <p className="text-foreground/50">暂无套餐，点击上方按钮添加</p>
          </div>
        ) : (
          plans.map(plan => {
            const levelConfig = LEVEL_CONFIG[plan.memberLevel];
            return (
              <div
                key={plan.id}
                className={`bg-surface rounded-lg p-4 ${!plan.enabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${levelConfig.color}`}>
                      {levelConfig.label}
                    </span>
                    <span className="font-medium">{plan.name}</span>
                    {!plan.enabled && (
                      <span className="px-2 py-0.5 text-xs bg-foreground/10 text-foreground/50 rounded">
                        已禁用
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleEnabled(plan)}
                      className={`px-3 py-1 text-xs rounded ${
                        plan.enabled 
                          ? 'text-red-500 hover:bg-red-500/10' 
                          : 'text-green-500 hover:bg-green-500/10'
                      }`}
                    >
                      {plan.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleEdit(plan)}
                      className="px-3 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="px-3 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-foreground/60">
                  <span>{formatDuration(plan.duration)}</span>
                  <span>¥{formatPrice(plan.price)}</span>
                  <span>{plan.coinPrice} 金币</span>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                {editingPlan ? '编辑套餐' : '添加套餐'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-foreground/50 hover:text-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm text-foreground/70 mb-1">套餐名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：VIP月卡"
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-1">会员等级</label>
                <select
                  value={formData.memberLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, memberLevel: e.target.value as MemberLevel }))}
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                >
                  <option value="vip">VIP</option>
                  <option value="svip">SVIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-1">时长（天）</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  min="1"
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-1">价格（分）</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                />
                <p className="text-xs text-foreground/50 mt-1">
                  实际价格: ¥{formatPrice(formData.price)}
                </p>
              </div>

              <div>
                <label className="block text-sm text-foreground/70 mb-1">金币价格</label>
                <input
                  type="number"
                  value={formData.coinPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, coinPrice: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-sm">启用套餐</label>
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

export default MembershipPlanManager;
