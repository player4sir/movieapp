'use client';

import { useState, useEffect } from 'react';
import type { MemberLevel } from '@/types/auth';

export interface GroupPermissions {
  memberLevel?: MemberLevel;
  canWatch?: boolean;
  canDownload?: boolean;
  maxFavorites?: number;
  adFree?: boolean;
}

export interface GroupFormData {
  name: string;
  description: string;
  color: string;
  permissions: GroupPermissions;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: GroupPermissions;
  createdAt: string;
  _count: { users: number };
}

export interface GroupFormModalProps {
  isOpen: boolean;
  group: UserGroup | null;
  onClose: () => void;
  onSave: (data: GroupFormData) => Promise<void>;
}

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

/**
 * GroupFormModal Component
 * Modal dialog for creating/editing user groups
 * Requirements: 1.2
 */
export function GroupFormModal({ isOpen, group, onClose, onSave }: GroupFormModalProps) {
  const [form, setForm] = useState<GroupFormData>({
    name: '',
    description: '',
    color: '#3b82f6',
    permissions: {},
  });
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setForm({
        name: group?.name || '',
        description: group?.description || '',
        color: group?.color || '#3b82f6',
        permissions: group?.permissions || {},
      });
    }
  }, [isOpen, group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const updatePerm = (key: keyof GroupPermissions, value: unknown) => {
    setForm({ ...form, permissions: { ...form.permissions, [key]: value } });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-xl lg:rounded-lg p-5 w-full lg:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">
          {group ? '编辑用户组' : '新建用户组'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5">名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="输入用户组名称"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[60px]"
              placeholder="输入用户组描述（可选）"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">标识颜色</label>
            <div className="flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-surface-secondary pt-4">
            <h3 className="text-sm font-medium mb-3">权限设置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">覆盖会员等级</label>
                <select
                  value={form.permissions.memberLevel || ''}
                  onChange={(e) => updatePerm('memberLevel', e.target.value || undefined)}
                  className="input"
                >
                  <option value="">不覆盖（使用用户自身等级）</option>
                  <option value="vip">VIP（可免费观看普通内容）</option>
                  <option value="svip">SVIP（可免费观看所有内容）</option>
                </select>
                <p className="text-xs text-foreground/50 mt-1">设置后，组内用户自动获得该会员权益，无需购买、永不过期</p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.permissions.adFree || false}
                  onChange={(e) => updatePerm('adFree', e.target.checked || undefined)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">免广告</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="btn-primary flex-1 py-2.5 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
