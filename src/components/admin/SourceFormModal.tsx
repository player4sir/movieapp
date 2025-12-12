'use client';

import { useState, useEffect } from 'react';
import type { SourceCategory } from '@/types/admin';
import { validateSourceForm, type SourceFormData } from '@/lib/source-validation';

export interface VideoSource {
  id: string;
  name: string;
  category: SourceCategory;
  apiUrl: string;
  timeout: number;
  retries: number;
  enabled: boolean;
  priority: number;
  lastTestAt: string | null;
  lastTestResult: boolean | null;
  lastTestResponseTime: number | null;
}

interface SourceFormModalProps {
  isOpen: boolean;
  source: VideoSource | null;
  onClose: () => void;
  onSave: (data: SourceFormData) => Promise<void>;
}

export function SourceFormModal({ isOpen, source, onClose, onSave }: SourceFormModalProps) {
  const [form, setForm] = useState<SourceFormData>({
    name: '',
    category: 'normal',
    apiUrl: '',
    timeout: 10000,
    retries: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: source?.name || '',
        category: source?.category || 'normal',
        apiUrl: source?.apiUrl || '',
        timeout: source?.timeout || 10000,
        retries: source?.retries || 3,
      });
      setError(null);
    }
  }, [isOpen, source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateSourceForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-t-xl lg:rounded-lg p-5 w-full lg:max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{source ? '编辑影视源' : '添加影视源'}</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5">名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => {
                setForm({ ...form, name: e.target.value });
                setError(null);
              }}
              className="input"
              placeholder="例如：主源"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1.5">分类 <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="normal"
                  checked={form.category === 'normal'}
                  onChange={() => setForm({ ...form, category: 'normal' })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">常规影视</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  value="adult"
                  checked={form.category === 'adult'}
                  onChange={() => setForm({ ...form, category: 'adult' })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">成人影视</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm mb-1.5">API 地址 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.apiUrl}
              onChange={e => {
                setForm({ ...form, apiUrl: e.target.value });
                setError(null);
              }}
              className="input"
              placeholder="http://example.com/api.php/provide/vod"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5">超时 (ms)</label>
              <input
                type="number"
                value={form.timeout}
                onChange={e => setForm({ ...form, timeout: parseInt(e.target.value) || 10000 })}
                className="input"
                min={1000}
                max={60000}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">重试次数</label>
              <input
                type="number"
                value={form.retries}
                onChange={e => setForm({ ...form, retries: parseInt(e.target.value) || 3 })}
                className="input"
                min={0}
                max={10}
              />
            </div>
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

// Re-export types for convenience
export type { SourceFormData } from '@/lib/source-validation';
