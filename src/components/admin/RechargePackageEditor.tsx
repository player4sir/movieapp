'use client';

import { useState } from 'react';

/**
 * Recharge package structure
 */
export interface RechargePackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface RechargePackageEditorProps {
  packages: RechargePackage[];
  onSave: (packages: RechargePackage[]) => Promise<void>;
  saving?: boolean;
}

/**
 * RechargePackageEditor Component
 * User-friendly editor for recharge packages configuration
 */
export function RechargePackageEditor({ packages, onSave, saving }: RechargePackageEditorProps) {
  const [items, setItems] = useState<RechargePackage[]>(packages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RechargePackage>>({});

  const handleAdd = () => {
    const newPackage: RechargePackage = {
      id: `pkg_${Date.now()}`,
      name: '新套餐',
      coins: 100,
      price: 10,
      bonus: 0,
      popular: false,
    };
    setItems([...items, newPackage]);
    setEditingId(newPackage.id);
    setEditForm(newPackage);
  };

  const handleEdit = (pkg: RechargePackage) => {
    setEditingId(pkg.id);
    setEditForm({ ...pkg });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此套餐？')) return;
    const updatedItems = items.filter(p => p.id !== id);
    setItems(updatedItems);
    // Auto-save to backend
    await onSave(updatedItems);
  };

  const handleSaveItem = async () => {
    if (!editingId || !editForm.name || !editForm.coins || !editForm.price) return;
    
    const updatedItems = items.map(p => 
      p.id === editingId 
        ? { ...p, ...editForm } as RechargePackage
        : p
    );
    setItems(updatedItems);
    setEditingId(null);
    setEditForm({});
    
    // Auto-save to backend
    await onSave(updatedItems);
  };

  const handleCancel = () => {
    // If it's a new unsaved package, remove it
    if (editingId && !packages.find(p => p.id === editingId)) {
      setItems(items.filter(p => p.id !== editingId));
    }
    setEditingId(null);
    setEditForm({});
  };



  return (
    <div className="space-y-3">
      {/* Package List */}
      {items.length === 0 ? (
        <p className="text-center py-4 text-foreground/50 text-sm">暂无充值套餐</p>
      ) : (
        <div className="space-y-2">
          {items.map((pkg) => (
            <div key={pkg.id} className="p-3 bg-background rounded-lg border border-surface-secondary">
              {editingId === pkg.id ? (
                /* Edit Form */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-foreground/50 mb-1">套餐名称</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1.5 bg-surface border border-surface-secondary rounded text-sm"
                        placeholder="如：小额充值"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/50 mb-1">价格 (元)</label>
                      <input
                        type="number"
                        value={editForm.price || ''}
                        onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 bg-surface border border-surface-secondary rounded text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/50 mb-1">金币数量</label>
                      <input
                        type="number"
                        value={editForm.coins || ''}
                        onChange={(e) => setEditForm({ ...editForm, coins: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 bg-surface border border-surface-secondary rounded text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/50 mb-1">赠送金币</label>
                      <input
                        type="number"
                        value={editForm.bonus || 0}
                        onChange={(e) => setEditForm({ ...editForm, bonus: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 bg-surface border border-surface-secondary rounded text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editForm.popular || false}
                        onChange={(e) => setEditForm({ ...editForm, popular: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-foreground/70">推荐套餐</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItem}
                      disabled={saving}
                      className="px-3 py-1 text-sm bg-primary text-white rounded disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '确定'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-3 py-1 text-sm text-foreground/60 hover:text-foreground disabled:opacity-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* Display */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pkg.name}</span>
                        {pkg.popular && (
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded">推荐</span>
                        )}
                      </div>
                      <div className="text-xs text-foreground/50 mt-0.5">
                        ¥{pkg.price} → {pkg.coins}金币
                        {pkg.bonus ? ` +${pkg.bonus}赠送` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(pkg)}
                      className="text-xs text-primary hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleAdd}
          disabled={!!editingId || saving}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          + 添加套餐
        </button>
        {saving && (
          <span className="text-xs text-foreground/50">保存中...</span>
        )}
      </div>
    </div>
  );
}
