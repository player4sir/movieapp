'use client';

import { useState, useEffect } from 'react';

/**
 * VIP exchange rate structure
 */
export interface VipExchangeRate {
  vip: number;
  svip: number;
}

interface VipExchangeRateEditorProps {
  rates: VipExchangeRate;
  onSave: (rates: VipExchangeRate) => Promise<void>;
  saving?: boolean;
}

/**
 * VipExchangeRateEditor Component
 * User-friendly editor for VIP exchange rate configuration
 */
export function VipExchangeRateEditor({ rates, onSave, saving }: VipExchangeRateEditorProps) {
  const [editing, setEditing] = useState(false);
  const [vipCoins, setVipCoins] = useState(rates.vip);
  const [svipCoins, setSvipCoins] = useState(rates.svip);

  // Sync with props when not editing
  useEffect(() => {
    if (!editing) {
      setVipCoins(rates.vip);
      setSvipCoins(rates.svip);
    }
  }, [rates, editing]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setVipCoins(rates.vip);
    setSvipCoins(rates.svip);
    setEditing(false);
  };

  const handleSave = async () => {
    await onSave({ vip: vipCoins, svip: svipCoins });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* VIP */}
          <div className="p-3 bg-background rounded-lg border border-surface-secondary">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-xs font-medium rounded">VIP</span>
              <span className="text-sm text-foreground/70">30天会员</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={vipCoins}
                onChange={(e) => setVipCoins(Number(e.target.value))}
                className="w-24 px-2 py-1.5 bg-surface border border-surface-secondary rounded text-sm"
                min="0"
              />
              <span className="text-sm text-foreground/50">金币</span>
            </div>
          </div>

          {/* SVIP */}
          <div className="p-3 bg-background rounded-lg border border-surface-secondary">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 text-xs font-medium rounded">SVIP</span>
              <span className="text-sm text-foreground/70">30天会员</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={svipCoins}
                onChange={(e) => setSvipCoins(Number(e.target.value))}
                className="w-24 px-2 py-1.5 bg-surface border border-surface-secondary rounded text-sm"
                min="0"
              />
              <span className="text-sm text-foreground/50">金币</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-foreground/60 hover:text-foreground"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* VIP Display */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-surface-secondary">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-xs font-medium rounded">VIP</span>
            <span className="text-sm text-foreground/70">30天</span>
          </div>
          <span className="text-sm font-medium">{rates.vip} 金币</span>
        </div>

        {/* SVIP Display */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-surface-secondary">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-600 text-xs font-medium rounded">SVIP</span>
            <span className="text-sm text-foreground/70">30天</span>
          </div>
          <span className="text-sm font-medium">{rates.svip} 金币</span>
        </div>
      </div>

      <button
        onClick={handleEdit}
        className="text-sm text-primary hover:underline"
      >
        编辑
      </button>
    </div>
  );
}
