'use client';

import { useState, useEffect } from 'react';

// Actually, since I'm rewriting the file, I can keep the constants there.

/**
 * Ad Slot data structure for form
 */
export interface AdSlotFormData {
  name: string;
  position: string;
  width: number;
  height: number;
  rotationStrategy: 'random' | 'sequential';
  displayMode: 'cover' | 'contain';
  maxVisible: number;
  carouselInterval: number;
  enabled: boolean;
}

/**
 * Ad Slot data from API
 */
export interface AdSlot {
  id: string;
  name: string;
  position: string;
  width: number;
  height: number;
  rotationStrategy: 'random' | 'sequential';
  displayMode?: 'cover' | 'contain';
  maxVisible?: number;
  carouselInterval?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Predefined ad slot positions
 */
export const PRESET_POSITIONS = [
  { value: 'home_top', label: '首页顶部', description: '首页分类下方，内容列表上方' },
  { value: 'adult_top', label: '成人页顶部', description: '成人专区分类下方，内容列表上方' },
  { value: 'search_top', label: '搜索页顶部', description: '搜索框下方，搜索结果上方' },
  { value: 'detail_middle', label: '详情页中部', description: '简介下方，播放按钮上方' },
  { value: 'play_bottom', label: '播放页底部', description: '视频信息下方' },
  { value: 'profile_middle', label: '个人中心中部', description: '金币区域下方，菜单列表上方' },
];

interface AdSlotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdSlotFormData) => Promise<void>;
  initialData?: AdSlot;
  title: string;
}

export function AdSlotFormModal({ isOpen, onClose, onSubmit, initialData, title }: AdSlotFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AdSlotFormData>({
    name: '',
    position: PRESET_POSITIONS[0].value,
    width: 300,
    height: 100,
    rotationStrategy: 'random',
    displayMode: 'cover',
    maxVisible: 3,
    carouselInterval: 5,
    enabled: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          position: initialData.position,
          width: initialData.width,
          height: initialData.height,
          rotationStrategy: initialData.rotationStrategy,
          displayMode: initialData.displayMode ?? 'cover',
          maxVisible: initialData.maxVisible ?? 3,
          carouselInterval: initialData.carouselInterval ?? 5,
          enabled: initialData.enabled,
        });
      } else {
        setFormData({
          name: '',
          position: PRESET_POSITIONS[0].value,
          width: 300,
          height: 100,
          rotationStrategy: 'random',
          displayMode: 'cover',
          maxVisible: 3,
          carouselInterval: 5,
          enabled: true,
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-secondary flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">广告位名称</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="例如：首页顶部横幅"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">位置</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="input w-full"
            >
              {PRESET_POSITIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-foreground/50 mt-1">
              {PRESET_POSITIONS.find(p => p.value === formData.position)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">宽度 (px)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 0 })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">高度 (px)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">轮播策略</label>
            <select
              value={formData.rotationStrategy}
              onChange={(e) => setFormData({ ...formData, rotationStrategy: e.target.value as 'random' | 'sequential' })}
              className="input w-full"
            >
              <option value="random">随机展示</option>
              <option value="sequential">顺序轮播</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">图片显示模式</label>
            <select
              value={formData.displayMode}
              onChange={(e) => setFormData({ ...formData, displayMode: e.target.value as 'cover' | 'contain' })}
              className="input w-full"
            >
              <option value="cover">填充裁剪 (cover)</option>
              <option value="contain">完整显示 (contain)</option>
            </select>
            <p className="text-xs text-foreground/50 mt-1">
              {formData.displayMode === 'cover' ? '图片填满容器，可能裁剪边缘' : '完整显示图片，可能有边距'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">最大展示数</label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={formData.maxVisible}
                onChange={(e) => setFormData({ ...formData, maxVisible: parseInt(e.target.value) || 3 })}
                className="input w-full"
              />
              <p className="text-xs text-foreground/50 mt-1">超出部分轮播</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">轮播间隔 (秒)</label>
              <input
                type="number"
                required
                min="1"
                max="30"
                value={formData.carouselInterval}
                onChange={(e) => setFormData({ ...formData, carouselInterval: parseInt(e.target.value) || 5 })}
                className="input w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded border-surface-secondary text-primary focus:ring-primary"
            />
            <label htmlFor="enabled" className="text-sm">启用此广告位</label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground/70 hover:bg-surface-secondary rounded-lg"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '提交中...' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
