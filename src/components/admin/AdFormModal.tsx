'use client';

import { useState, useEffect } from 'react';

/**
 * Ad data structure for form
 */
export interface AdFormData {
  title: string;
  imageUrl: string;
  targetUrl: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
  targetMemberLevels: string[];
  targetGroupIds: string[];
  priority: number;
  slotIds?: string[];
}

/**
 * Ad data from API
 */
export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
  targetMemberLevels: string[];
  targetGroupIds: string[];
  priority: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface AdFormModalProps {
  isOpen: boolean;
  ad: Ad | null;
  onClose: () => void;
  onSave: (data: AdFormData) => Promise<void>;
}

/**
 * Modal for creating/editing ads
 * Requirements: 1.1, 1.2
 */

interface AdSlotSimple {
  id: string;
  name: string;
  position: string;
  enabled: boolean;
}

export function AdFormModal({ isOpen, ad: initialAd, onClose, onSave }: AdFormModalProps) {
  const [form, setForm] = useState<AdFormData>({
    title: '',
    imageUrl: '',
    targetUrl: '',
    startDate: '',
    endDate: '',
    enabled: true,
    targetMemberLevels: [],
    targetGroupIds: [],
    priority: 0,
    slotIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slot selection state
  const [slots, setSlots] = useState<AdSlotSimple[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch all slots once
  useEffect(() => {
    if (isOpen) {
      setLoadingSlots(true);
      fetch('/api/admin/ads/slots')
        .then(res => res.ok ? res.json() : { data: [] })
        .then(data => setSlots(data.data || []))
        .catch(err => console.error('Failed to fetch slots', err))
        .finally(() => setLoadingSlots(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialAd) {
        // Initialize basic data from prop
        setForm({
          title: initialAd.title,
          imageUrl: initialAd.imageUrl,
          targetUrl: initialAd.targetUrl,
          startDate: formatDateForInput(initialAd.startDate),
          endDate: formatDateForInput(initialAd.endDate),
          enabled: initialAd.enabled,
          targetMemberLevels: initialAd.targetMemberLevels || [],
          targetGroupIds: initialAd.targetGroupIds || [],
          priority: initialAd.priority,
          slotIds: [], // Placeholder, will fetch
        });

        // Fetch full details including slotIds
        fetch(`/api/admin/ads/${initialAd.id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.data?.slotIds) {
              setForm(prev => ({ ...prev, slotIds: data.data.slotIds }));
            }
          })
          .catch(console.error);

      } else {
        // Default values for new ad
        const now = new Date();
        const oneMonthLater = new Date(now);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        setForm({
          title: '',
          imageUrl: '',
          targetUrl: '',
          startDate: formatDateForInput(now.toISOString()),
          endDate: formatDateForInput(oneMonthLater.toISOString()),
          enabled: true,
          targetMemberLevels: [],
          targetGroupIds: [],
          priority: 0,
          slotIds: [],
        });
      }
      setError(null);
    }
  }, [isOpen, initialAd]);

  const formatDateForInput = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  const validateForm = (): string | null => {
    if (!form.title.trim()) return '广告标题不能为空';
    if (form.title.length > 255) return '广告标题不能超过255个字符';
    if (!form.imageUrl.trim()) return '广告图片URL不能为空';
    if (!form.targetUrl.trim()) return '广告目标URL不能为空';
    if (!form.startDate) return '开始日期不能为空';
    if (!form.endDate) return '结束日期不能为空';

    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (endDate <= startDate) return '结束日期必须晚于开始日期';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleMemberLevelToggle = (level: string) => {
    setForm(prev => ({
      ...prev,
      targetMemberLevels: prev.targetMemberLevels.includes(level)
        ? prev.targetMemberLevels.filter(l => l !== level)
        : [...prev.targetMemberLevels, level],
    }));
  };

  const handleSlotToggle = (slotId: string) => {
    setForm(prev => {
      const currentSlots = prev.slotIds || [];
      return {
        ...prev,
        slotIds: currentSlots.includes(slotId)
          ? currentSlots.filter(id => id !== slotId)
          : [...currentSlots, slotId]
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-background rounded-t-xl lg:rounded-lg p-5 w-full lg:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{initialAd ? '编辑广告' : '添加广告'}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5">标题 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="广告标题"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">图片URL <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.imageUrl}
              onChange={e => setForm({ ...form, imageUrl: e.target.value })}
              className="input"
              placeholder="https://example.com/ad-image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">目标URL <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.targetUrl}
              onChange={e => setForm({ ...form, targetUrl: e.target.value })}
              className="input"
              placeholder="https://example.com/landing-page"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5">开始时间 <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">结束时间 <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Ad Slot Selection */}
          <div className="border-t border-b border-surface-secondary py-4 my-2">
            <label className="block text-sm mb-2 font-medium">投放位置</label>
            {loadingSlots ? (
              <div className="text-xs text-foreground/50">加载中...</div>
            ) : slots.length === 0 ? (
              <div className="text-xs text-foreground/50">暂无可用广告位</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {slots.map(slot => (
                  <label key={slot.id} className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${(form.slotIds || []).includes(slot.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-surface-secondary hover:bg-surface-secondary/50'
                    }`}>
                    <input
                      type="checkbox"
                      checked={(form.slotIds || []).includes(slot.id)}
                      onChange={() => handleSlotToggle(slot.id)}
                      className="mt-1 w-4 h-4 text-primary rounded"
                    />
                    <div>
                      <div className="text-sm font-medium">{slot.name}</div>
                      <div className="text-xs text-foreground/50">{slot.position}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-foreground/50 mt-1">未选择位置的广告将不会在前端显示</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5">优先级</label>
              <input
                type="number"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                className="input"
                min={0}
                max={100}
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">启用广告</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5">目标会员等级 (留空则对所有免费用户展示)</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.targetMemberLevels.includes('free')}
                  onChange={() => handleMemberLevelToggle('free')}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">免费用户</span>
              </label>
            </div>
            <p className="text-xs text-foreground/50 mt-1">VIP/SVIP用户不会看到广告</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">取消</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
