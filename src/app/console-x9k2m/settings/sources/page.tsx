'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { SourceFormModal, type VideoSource, type SourceFormData } from '@/components/admin/SourceFormModal';
import type { SourceCategory } from '@/types/admin';

interface TestResult {
  success: boolean;
  responseTime: number | null;
  error: string | null;
  categoriesCount?: number;
}

/**
 * Groups video sources by category and sorts by priority within each group
 */
function groupSourcesByCategory(sources: VideoSource[]): Record<SourceCategory, VideoSource[]> {
  const grouped: Record<SourceCategory, VideoSource[]> = { normal: [], adult: [] };
  for (const source of sources) {
    const category = source.category || 'normal';
    grouped[category].push(source);
  }
  grouped.normal.sort((a, b) => a.priority - b.priority);
  grouped.adult.sort((a, b) => a.priority - b.priority);
  return grouped;
}

function SourceCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-surface-secondary bg-surface-secondary/30">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="w-6 h-6 bg-surface-secondary/50 rounded animate-pulse" />
          <div className="w-6 h-6 bg-surface-secondary/50 rounded animate-pulse" />
        </div>
        <div className="w-2 h-2 rounded-full bg-surface-secondary/50 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-24 bg-surface-secondary/50 rounded animate-pulse" />
            <div className="h-4 w-12 bg-surface-secondary/50 rounded animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-surface-secondary/50 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-10 bg-surface-secondary/50 rounded animate-pulse" />
          <div className="h-5 w-10 bg-surface-secondary/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface SourceCategorySectionProps {
  title: string;
  category: SourceCategory;
  sources: VideoSource[];
  testingId: string | null;
  onMove: (category: SourceCategory, index: number, direction: 'up' | 'down') => void;
  onToggle: (id: string) => void;
  onTest: (id: string) => void;
  onEdit: (source: VideoSource) => void;
  onDelete: (id: string) => void;
}

function SourceCategorySection({ title, category, sources, testingId, onMove, onToggle, onTest, onEdit, onDelete }: SourceCategorySectionProps) {
  if (sources.length === 0) {
    return (
      <div className="border border-dashed border-surface-secondary rounded-lg p-4">
        <h3 className="text-sm font-medium text-foreground/70 mb-2">{title}</h3>
        <p className="text-xs text-foreground/40 text-center py-4">暂无{title}源</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-foreground/70 mb-3">{title}</h3>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <SourceCard
            key={source.id}
            source={source}
            index={index}
            category={category}
            totalInCategory={sources.length}
            testingId={testingId}
            onMove={onMove}
            onToggle={onToggle}
            onTest={onTest}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface SourceCardProps {
  source: VideoSource;
  index: number;
  category: SourceCategory;
  totalInCategory: number;
  testingId: string | null;
  onMove: (category: SourceCategory, index: number, direction: 'up' | 'down') => void;
  onToggle: (id: string) => void;
  onTest: (id: string) => void;
  onEdit: (source: VideoSource) => void;
  onDelete: (id: string) => void;
}

function SourceCard({ source, index, category, totalInCategory, testingId, onMove, onToggle, onTest, onEdit, onDelete }: SourceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const getStatusColor = () => {
    if (source.lastTestResult === null) return 'bg-gray-400';
    return source.lastTestResult ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className={`p-3 rounded-lg border transition-opacity ${source.enabled ? 'border-surface-secondary bg-surface-secondary/30' : 'border-surface-secondary/50 bg-surface-secondary/10 opacity-60'}`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMove(category, index, 'up')} disabled={index === 0} className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30" aria-label="上移">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={() => onMove(category, index, 'down')} disabled={index === totalInCategory - 1} className="p-1 text-foreground/40 hover:text-foreground disabled:opacity-30" aria-label="下移">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} title={source.lastTestResult === null ? '未测试' : source.lastTestResult ? '连接正常' : '连接失败'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">{source.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${source.enabled ? 'bg-green-500/20 text-green-500' : 'bg-foreground/10 text-foreground/50'}`}>
              {source.enabled ? '启用' : '禁用'}
            </span>
            {source.lastTestResult && source.lastTestResponseTime && <span className="text-xs text-green-500">{source.lastTestResponseTime}ms</span>}
            {source.lastTestResult === false && <span className="text-xs text-red-500">失败</span>}
          </div>
          <p className="text-xs text-foreground/50 truncate">{source.apiUrl}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggle(source.id)} className="text-sm text-foreground/60 hover:text-foreground">{source.enabled ? '禁用' : '启用'}</button>
          <button onClick={() => onTest(source.id)} disabled={testingId === source.id} className="text-sm text-primary hover:underline disabled:opacity-50">
            {testingId === source.id ? '测试中...' : '测试'}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-foreground/60 hover:text-foreground rounded" aria-label="更多操作">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-background border border-surface-secondary rounded-lg shadow-lg py-1 z-20 min-w-[100px]">
                  <button onClick={() => { onEdit(source); setMenuOpen(false); }} className="w-full px-3 py-2 text-sm text-left hover:bg-surface-secondary/50">编辑</button>
                  <button onClick={() => { onDelete(source.id); setMenuOpen(false); }} className="w-full px-3 py-2 text-sm text-left text-red-500 hover:bg-surface-secondary/50">删除</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SourcesConfigPage() {
  const { getAccessToken } = useAdminAuth();
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<VideoSource | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getAccessToken();
    if (!token) throw new Error('未登录');
    const res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      window.location.href = '/console-x9k2m/login';
      throw new Error('登录已过期');
    }
    return res;
  }, [getAccessToken]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/sources');
      if (res.ok) setSources(await res.json());
    } catch (err) { console.error('Fetch sources error:', err); }
    finally { setLoading(false); }
  }, [fetchWithAuth]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleSaveSource = async (data: SourceFormData) => {
    try {
      const url = editingSource ? `/api/admin/sources/${editingSource.id}` : '/api/admin/sources';
      const res = await fetchWithAuth(url, { method: editingSource ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || '保存失败'); }
      setMessage({ type: 'success', text: editingSource ? '影视源已更新' : '影视源已添加' });
      fetchSources(); setIsModalOpen(false); setEditingSource(null);
    } catch (err) { setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' }); throw err; }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('确定删除该影视源？')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/sources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setMessage({ type: 'success', text: '影视源已删除' }); fetchSources();
    } catch (err) { setMessage({ type: 'error', text: err instanceof Error ? err.message : '删除失败' }); }
  };

  const handleToggleSource = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/sources/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle' }) });
      if (!res.ok) throw new Error('切换失败');
      fetchSources();
    } catch (err) { setMessage({ type: 'error', text: err instanceof Error ? err.message : '切换失败' }); }
  };

  const handleTestSource = async (id: string) => {
    setTestingId(id); setMessage(null);
    try {
      const res = await fetchWithAuth(`/api/admin/sources/${id}/test`, { method: 'POST' });
      const result: TestResult = await res.json();
      if (result.success) setMessage({ type: 'success', text: `连接成功！响应: ${result.responseTime}ms, 分类: ${result.categoriesCount}` });
      else setMessage({ type: 'error', text: `连接失败: ${result.error}` });
      fetchSources();
    } catch (err) { setMessage({ type: 'error', text: err instanceof Error ? err.message : '测试失败' }); }
    finally { setTestingId(null); }
  };

  const handleMoveSource = async (category: SourceCategory, index: number, direction: 'up' | 'down') => {
    const grouped = groupSourcesByCategory(sources);
    const categoryList = grouped[category];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= categoryList.length) return;
    
    // Create a new copy of the list
    const newCategoryList = [...categoryList];
    
    // Swap the items
    [newCategoryList[index], newCategoryList[newIndex]] = [newCategoryList[newIndex], newCategoryList[index]];
    
    // Update priorities to match new order
    // This is crucial because groupSourcesByCategory sorts by priority
    newCategoryList.forEach((source, i) => {
      source.priority = i;
    });

    // Reconstruct the full sources array
    // We need to make sure we don't lose sources from the other category
    const otherCategory = category === 'normal' ? 'adult' : 'normal';
    const otherList = grouped[otherCategory];
    
    const newSources = [...newCategoryList, ...otherList];
    
    // Optimistically update UI
    setSources(newSources);

    try {
      const res = await fetchWithAuth('/api/admin/sources/reorder', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ sourceIds: newCategoryList.map(s => s.id) }) 
      });
      
      if (!res.ok) {
        throw new Error('排序失败');
      }
      
      // Optional: Refetch to ensure sync with server
      // fetchSources(); 
    } catch (err) { 
      // Revert on error
      console.error(err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '排序失败' }); 
      fetchSources(); // Revert to server state
    }
  };

  const groupedSources = useMemo(() => groupSourcesByCategory(sources), [sources]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-surface-secondary/50 rounded animate-pulse" />
          <div className="h-7 w-24 bg-surface-secondary/50 rounded animate-pulse" />
        </div>
        <div className="bg-surface rounded-lg p-4 lg:p-6">
          <div className="space-y-6">
            <div><div className="h-4 w-16 bg-surface-secondary/50 rounded animate-pulse mb-3" /><div className="space-y-2">{[1, 2].map(i => <SourceCardSkeleton key={i} />)}</div></div>
            <div><div className="h-4 w-16 bg-surface-secondary/50 rounded animate-pulse mb-3" /><SourceCardSkeleton /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/console-x9k2m/settings" className="p-2 -ml-2 text-foreground/60 hover:text-foreground rounded-lg hover:bg-surface-secondary/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-xl font-semibold">影视源管理</h1>
        </div>
        <button onClick={() => { setEditingSource(null); setIsModalOpen(true); }} className="btn-primary px-3 py-1.5 text-sm">添加源</button>
      </div>

      {message && <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{message.text}</div>}

      <div className="bg-surface rounded-lg p-4 lg:p-6">
        {sources.length === 0 ? (
          <p className="text-center py-8 text-foreground/50">暂无影视源，点击上方按钮添加</p>
        ) : (
          <div className="space-y-6">
            <SourceCategorySection title="常规影视" category="normal" sources={groupedSources.normal} testingId={testingId} onMove={handleMoveSource} onToggle={handleToggleSource} onTest={handleTestSource} onEdit={(source) => { setEditingSource(source); setIsModalOpen(true); }} onDelete={handleDeleteSource} />
            <SourceCategorySection title="成人影视" category="adult" sources={groupedSources.adult} testingId={testingId} onMove={handleMoveSource} onToggle={handleToggleSource} onTest={handleTestSource} onEdit={(source) => { setEditingSource(source); setIsModalOpen(true); }} onDelete={handleDeleteSource} />
          </div>
        )}
        <p className="text-xs text-foreground/40 mt-4">提示：使用上下箭头调整优先级，系统将按顺序查询启用的源</p>
      </div>

      <SourceFormModal isOpen={isModalOpen} source={editingSource} onClose={() => { setIsModalOpen(false); setEditingSource(null); }} onSave={handleSaveSource} />
    </div>
  );
}
