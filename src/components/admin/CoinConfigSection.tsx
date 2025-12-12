'use client';

import { useState, useEffect, useCallback } from 'react';
import { RechargePackageEditor, RechargePackage } from './RechargePackageEditor';
import { VipExchangeRateEditor, VipExchangeRate } from './VipExchangeRateEditor';
import { api } from '@/lib/api-client';

/**
 * Coin configuration value from API
 * Requirements: 5.1
 */
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

/**
 * Configuration display labels
 */
const CONFIG_LABELS: Record<string, string> = {
  checkin_base_reward: '签到基础奖励',
  checkin_streak_bonus: '连续签到奖励',
  checkin_streak_max: '连续签到最大天数',
  vip_exchange_rate: 'VIP兑换比例',
  recharge_packages: '充值套餐',
  referral_reward_inviter: '邀请人奖励',
  referral_reward_invitee: '新人奖励',
};

// Configs that should use special editors instead of JSON
const SPECIAL_EDITORS = ['recharge_packages', 'vip_exchange_rate'];

/**
 * CoinConfigSection Component
 * Displays and allows editing of coin system configurations.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function CoinConfigSection({ onShowToast }: CoinConfigSectionProps) {
  const [configs, setConfigs] = useState<CoinConfigValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  }, [onShowToast]);

  /**
   * Fetch all coin configurations
   * Requirements: 5.1
   */
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.get<{ configs: CoinConfigValue[] }>(
      '/api/admin/coins/config'
    );

    // 401 会自动跳转到登录页，这里只处理其他错误
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

  /**
   * Start editing a config
   */
  const handleEdit = (config: CoinConfigValue) => {
    setEditingKey(config.key);
    setEditValue(formatValueForEdit(config.value));
  };

  /**
   * Cancel editing
   */
  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  /**
   * Save config changes
   * Requirements: 5.2, 5.3, 5.4
   */
  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const parsedValue = parseEditValue(key, editValue);

      const { error: apiError } = await api.put(
        '/api/admin/coins/config',
        { key, value: parsedValue }
      );

      // 401 会自动跳转到登录页
      if (apiError) {
        throw new Error(apiError);
      }

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

  /**
   * Format value for display
   */
  const formatValueForDisplay = (key: string, value: unknown): string => {
    if (key === 'vip_exchange_rate' && typeof value === 'object' && value !== null) {
      const rates = value as Record<string, number>;
      return Object.entries(rates)
        .map(([level, coins]) => `${level.toUpperCase()}: ${coins}金币`)
        .join(', ');
    }
    if (key === 'checkin_streak_bonus' && Array.isArray(value)) {
      return value.map((v, i) => `第${i + 1}天: +${v}`).join(', ');
    }
    if (key === 'recharge_packages' && Array.isArray(value)) {
      return `${value.length} 个套餐`;
    }
    return String(value);
  };

  /**
   * Format value for editing
   */
  const formatValueForEdit = (value: unknown): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  /**
   * Parse edited value back to proper type
   */
  const parseEditValue = (key: string, value: string): unknown => {
    if (key === 'checkin_base_reward' || key === 'checkin_streak_max') {
      return parseInt(value, 10);
    }
    if (key === 'checkin_streak_bonus' || key === 'vip_exchange_rate' || key === 'recharge_packages') {
      return JSON.parse(value);
    }
    return value;
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-4 lg:p-6">
        <div className="h-6 w-28 bg-surface-secondary/50 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-surface-secondary/30 rounded-lg">
              <div className="h-4 w-24 bg-surface-secondary/50 rounded animate-pulse mb-2" />
              <div className="h-5 w-48 bg-surface-secondary/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-lg p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold mb-4">金币配置</h2>
        <div className="text-center py-6">
          <p className="text-red-500 mb-3">{error}</p>
          <button onClick={fetchConfigs} className="text-primary hover:underline">
            重试
          </button>
        </div>
      </div>
    );
  }

  /**
   * Save recharge packages using the special editor
   */
  const handleSavePackages = async (packages: RechargePackage[]) => {
    setSaving(true);
    try {
      const { error: apiError } = await api.put(
        '/api/admin/coins/config',
        { key: 'recharge_packages', value: packages }
      );

      // 401 会自动跳转到登录页
      if (apiError) {
        throw new Error(apiError);
      }

      showToast('充值套餐已更新', 'success');
      fetchConfigs();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save VIP exchange rates using the special editor
   */
  const handleSaveVipRates = async (rates: VipExchangeRate) => {
    setSaving(true);
    try {
      const { error: apiError } = await api.put(
        '/api/admin/coins/config',
        { key: 'vip_exchange_rate', value: rates }
      );

      if (apiError) {
        throw new Error(apiError);
      }

      showToast('VIP兑换比例已更新', 'success');
      fetchConfigs();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Separate configs into regular and special
  const regularConfigs = configs.filter(c => !SPECIAL_EDITORS.includes(c.key));
  const rechargeConfig = configs.find(c => c.key === 'recharge_packages');
  const vipRateConfig = configs.find(c => c.key === 'vip_exchange_rate');

  return (
    <div className="bg-surface rounded-lg p-4 lg:p-6">
      <h2 className="text-base lg:text-lg font-semibold mb-4">金币配置</h2>

      {/* Regular Configs */}
      <div className="space-y-3 mb-6">
        {regularConfigs.map((config) => (
          <div key={config.key} className="p-3 bg-surface-secondary/30 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {CONFIG_LABELS[config.key] || config.key}
                  </span>
                </div>
                <p className="text-xs text-foreground/50 mb-2">{config.description}</p>

                {editingKey === config.key ? (
                  <div className="space-y-2">
                    {config.key === 'checkin_base_reward' || config.key === 'checkin_streak_max' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm"
                        min="0"
                      />
                    ) : (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm font-mono"
                        rows={4}
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(config.key)}
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
                ) : (
                  <p className="text-sm text-foreground/80 break-all">
                    {formatValueForDisplay(config.key, config.value)}
                  </p>
                )}
              </div>

              {editingKey !== config.key && (
                <button
                  onClick={() => handleEdit(config)}
                  className="text-sm text-primary hover:underline shrink-0"
                >
                  编辑
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* VIP Exchange Rate - Special Editor */}
      {vipRateConfig && (
        <div className="p-3 bg-surface-secondary/30 rounded-lg mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">VIP兑换比例</span>
          </div>
          <p className="text-xs text-foreground/50 mb-3">{vipRateConfig.description}</p>
          <VipExchangeRateEditor
            rates={(vipRateConfig.value as VipExchangeRate) || { vip: 1000, svip: 3000 }}
            onSave={handleSaveVipRates}
            saving={saving}
          />
        </div>
      )}

      {/* Recharge Packages - Special Editor */}
      {rechargeConfig && (
        <div className="p-3 bg-surface-secondary/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">充值套餐</span>
          </div>
          <p className="text-xs text-foreground/50 mb-3">{rechargeConfig.description}</p>
          <RechargePackageEditor
            packages={(rechargeConfig.value as RechargePackage[]) || []}
            onSave={handleSavePackages}
            saving={saving}
          />
        </div>
      )}

      <p className="text-xs text-foreground/40 mt-4">
        提示：修改配置后将立即生效，请谨慎操作
      </p>
    </div>
  );
}
