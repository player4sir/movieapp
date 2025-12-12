'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

/**
 * Paywall configuration value from API
 * Requirements: 1.1
 */
export interface PaywallConfigValue {
  value: unknown;
  description: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PaywallConfigSectionProps {
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

/**
 * Configuration display labels
 */
const CONFIG_LABELS: Record<string, string> = {
  paywall_normal_price: '普通内容价格',
  paywall_adult_price: '成人内容价格',
  paywall_preview_duration: '试看时长',
  paywall_enabled: '付费墙开关',
};

/**
 * Configuration units
 */
const CONFIG_UNITS: Record<string, string> = {
  paywall_normal_price: '金币/集',
  paywall_adult_price: '金币/集',
  paywall_preview_duration: '秒',
  paywall_enabled: '',
};

/**
 * PaywallConfigSection Component
 * Displays and allows editing of paywall configurations.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export function PaywallConfigSection({ onShowToast }: PaywallConfigSectionProps) {
  const [configs, setConfigs] = useState<Record<string, PaywallConfigValue>>({});
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
   * Fetch all paywall configurations
   * Requirements: 1.1
   */
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: apiError } = await api.get<{ configs: Record<string, PaywallConfigValue> }>(
      '/api/admin/paywall/config'
    );
    
    // 401 会自动跳转到登录页，这里只处理其他错误
    if (apiError) {
      setError(apiError);
    } else if (data) {
      setConfigs(data.configs || {});
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /**
   * Start editing a config
   */
  const handleEdit = (key: string, value: unknown) => {
    setEditingKey(key);
    setEditValue(String(value));
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
   * Requirements: 1.2, 1.3, 1.4
   */
  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      let parsedValue: unknown;
      
      if (key === 'paywall_enabled') {
        parsedValue = editValue === 'true';
      } else {
        parsedValue = parseInt(editValue, 10);
        if (isNaN(parsedValue as number)) {
          throw new Error('请输入有效的数字');
        }
      }
      
      const { error: apiError } = await api.put(
        '/api/admin/paywall/config',
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
   * Toggle boolean config
   */
  const handleToggle = async (key: string, currentValue: boolean) => {
    setSaving(true);
    try {
      const { error: apiError } = await api.put(
        '/api/admin/paywall/config',
        { key, value: !currentValue }
      );
      
      // 401 会自动跳转到登录页
      if (apiError) {
        throw new Error(apiError);
      }

      showToast('配置已更新', 'success');
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
    if (key === 'paywall_enabled') {
      return value ? '已开启' : '已关闭';
    }
    const unit = CONFIG_UNITS[key];
    return `${value}${unit ? ` ${unit}` : ''}`;
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
        <h2 className="text-base lg:text-lg font-semibold mb-4">付费墙配置</h2>
        <div className="text-center py-6">
          <p className="text-red-500 mb-3">{error}</p>
          <button onClick={fetchConfigs} className="text-primary hover:underline">
            重试
          </button>
        </div>
      </div>
    );
  }

  const configKeys = Object.keys(configs);

  return (
    <div className="bg-surface rounded-lg p-4 lg:p-6">
      <h2 className="text-base lg:text-lg font-semibold mb-4 flex items-center gap-2">
        <PaywallIcon />
        付费墙配置
      </h2>
      
      <div className="space-y-3">
        {configKeys.map((key) => {
          const config = configs[key];
          const isBoolean = key === 'paywall_enabled';
          const isEditing = editingKey === key;
          
          return (
            <div key={key} className="p-3 bg-surface-secondary/30 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {CONFIG_LABELS[key] || key}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/50 mb-2">{config.description}</p>
                  
                  {isEditing && !isBoolean ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-32 px-3 py-2 bg-background border border-surface-secondary rounded-lg text-sm"
                          min="0"
                        />
                        <span className="text-sm text-foreground/50">
                          {CONFIG_UNITS[key]}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(key)}
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
                    <p className="text-sm text-foreground/80">
                      {formatValueForDisplay(key, config.value)}
                    </p>
                  )}
                </div>
                
                {isBoolean ? (
                  <button
                    onClick={() => handleToggle(key, config.value as boolean)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.value ? 'bg-primary' : 'bg-surface-secondary'
                    } ${saving ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                ) : !isEditing && (
                  <button
                    onClick={() => handleEdit(key, config.value)}
                    className="text-sm text-primary hover:underline shrink-0"
                  >
                    编辑
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-foreground/40 mt-4">
        提示：修改配置后将立即生效，请谨慎操作
      </p>
    </div>
  );
}

/**
 * Paywall icon for section header
 */
function PaywallIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
