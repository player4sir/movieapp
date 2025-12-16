'use client';

import { useState, useEffect, useCallback } from 'react';
import { RechargePackageEditor, RechargePackage } from './RechargePackageEditor';
import { VipExchangeRateEditor, VipExchangeRate } from './VipExchangeRateEditor';
import { api } from '@/lib/api-client';

export interface CoinConfigValue {
  key: string;
  value: unknown;
  description: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CoinConfigSectionProps {
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const CONFIG_LABELS: Record<string, string> = {
  checkin_base_reward: '基础奖励',
  checkin_streak_bonus: '连续签到奖励',
  checkin_streak_max: '最大连续天数',
  vip_exchange_rate: 'VIP兑换比例',
  recharge_packages: '充值套餐',
  referral_reward_inviter: '邀请人奖励',
  referral_reward_invitee: '新人奖励',
};

const CONFIG_GROUPS = {
  checkin: { title: '签到奖励', keys: ['checkin_base_reward', 'checkin_streak_bonus', 'checkin_streak_max'] },
  referral: { title: '推广奖励', keys: ['referral_reward_inviter', 'referral_reward_invitee'] },
};

export function CoinConfigSection({ onShowToast }: CoinConfigSectionProps) {
  const [configs, setConfigs] = useState<CoinConfigValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) onShowToast(message, type);
  }, [onShowToast]);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.get<{ configs: CoinConfigValue[] }>('/api/admin/coins/config');
    if (apiError) {
      setError(apiError);
    } else if (data) {
      setConfigs(data.configs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleEdit = (config: CoinConfigValue) => {
    setEditingKey(config.key);
    setEditValue(formatValueForEdit(config.value));
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const parsedValue = parseEditValue(key, editValue);
      const { error: apiError } = await api.put('/api/admin/coins/config', { key, value: parsedValue });
      if (apiError) throw new Error(apiError);
      showToast('配置已更新', 'success');
      setEditingKey(null);
      setEditValue('');
      fetchConfigs();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatValueForDisplay = (key: string, value: unknown): string => {
    if (key === 'vip_exchange_rate' && typeof value === 'object' && value !== null) {
      const rates = value as Record<string, number>;
      return Object.entries(rates).map(([level, coins]) => `${level.toUpperCase()}: ${coins}`).join(' / ');
    }
    if (key === 'checkin_streak_bonus' && Array.isArray(value)) {
      return value.map((v, i) => `第${i + 1}天+${v}`).join(', ');
    }
    if (key === 'recharge_packages' && Array.isArray(value)) {
      return `${value.length} 个套餐`;
    }
    return String(value);
  };

  const formatValueForEdit = (value: unknown): string => {
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const parseEditValue = (key: string, value: string): unknown => {
    if (key === 'checkin_base_reward' || key === 'checkin_streak_max' ||
      key === 'referral_reward_inviter' || key === 'referral_reward_invitee') {
      return parseInt(value, 10);
    }
    if (key === 'checkin_streak_bonus' || key === 'vip_exchange_rate' || key === 'recharge_packages') {
      return JSON.parse(value);
    }
    return value;
  };

  const handleSavePackages = async (packages: RechargePackage[]) => {
    setSaving(true);
    try {
      const { error: apiError } = await api.put('/api/admin/coins/config', { key: 'recharge_packages', value: packages });
      if (apiError) throw new Error(apiError);
      showToast('充值套餐已更新', 'success');
      fetchConfigs();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVipRates = async (rates: VipExchangeRate) => {
    setSaving(true);
    try {
      const { error: apiError } = await api.put('/api/admin/coins/config', { key: 'vip_exchange_rate', value: rates });
      if (apiError) throw new Error(apiError);
      showToast('VIP兑换比例已更新', 'success');
      fetchConfigs();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-surface rounded-lg border border-border/50">
            <div className="h-4 w-20 bg-surface-secondary/50 rounded animate-pulse mb-3" />
            <div className="h-8 bg-surface-secondary/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-3">{error}</p>
        <button onClick={fetchConfigs} className="text-primary hover:underline text-sm">重试</button>
      </div>
    );
  }

  const rechargeConfig = configs.find(c => c.key === 'recharge_packages');
  const vipRateConfig = configs.find(c => c.key === 'vip_exchange_rate');

  const renderConfigItem = (config: CoinConfigValue, isLast: boolean) => {
    const isEditing = editingKey === config.key;
    const isNumeric = ['checkin_base_reward', 'checkin_streak_max', 'referral_reward_inviter', 'referral_reward_invitee'].includes(config.key);

    return (
      <div key={config.key} className={`py-3 ${!isLast ? 'border-b border-border/20' : ''}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{CONFIG_LABELS[config.key] || config.key}</span>
          {!isEditing && (
            <button onClick={() => handleEdit(config)} className="text-xs text-primary hover:underline">
              编辑
            </button>
          )}
        </div>
        <p className="text-xs text-foreground/40 mb-2">{config.description}</p>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type={isNumeric ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={() => handleSave(config.key)}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg"
            >
              {saving ? '...' : '保存'}
            </button>
            <button onClick={handleCancel} className="px-3 py-2 text-sm text-foreground/40">取消</button>
          </div>
        ) : (
          <span className="text-sm font-medium text-yellow-500">
            {formatValueForDisplay(config.key, config.value)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 签到奖励 */}
      <div className="bg-surface rounded-lg border border-border/50">
        <div className="px-4 py-2 border-b border-border/30">
          <span className="text-xs font-medium text-foreground/50 uppercase">{CONFIG_GROUPS.checkin.title}</span>
        </div>
        <div className="px-4">
          {configs.filter(c => CONFIG_GROUPS.checkin.keys.includes(c.key)).map((c, i, arr) => renderConfigItem(c, i === arr.length - 1))}
        </div>
      </div>

      {/* 推广奖励 */}
      <div className="bg-surface rounded-lg border border-border/50">
        <div className="px-4 py-2 border-b border-border/30">
          <span className="text-xs font-medium text-foreground/50 uppercase">{CONFIG_GROUPS.referral.title}</span>
        </div>
        <div className="px-4">
          {configs.filter(c => CONFIG_GROUPS.referral.keys.includes(c.key)).map((c, i, arr) => renderConfigItem(c, i === arr.length - 1))}
        </div>
      </div>

      {/* VIP兑换 */}
      {vipRateConfig && (
        <div className="bg-surface rounded-lg border border-border/50">
          <div className="px-4 py-2 border-b border-border/30">
            <span className="text-xs font-medium text-foreground/50 uppercase">VIP兑换</span>
          </div>
          <div className="p-4">
            <VipExchangeRateEditor
              rates={(vipRateConfig.value as VipExchangeRate) || { vip: 1000, svip: 3000 }}
              onSave={handleSaveVipRates}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* 充值套餐 */}
      {rechargeConfig && (
        <div className="bg-surface rounded-lg border border-border/50">
          <div className="px-4 py-2 border-b border-border/30">
            <span className="text-xs font-medium text-foreground/50 uppercase">充值套餐</span>
          </div>
          <div className="p-4">
            <RechargePackageEditor
              packages={(rechargeConfig.value as RechargePackage[]) || []}
              onSave={handleSavePackages}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
