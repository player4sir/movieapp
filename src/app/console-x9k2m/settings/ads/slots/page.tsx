'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type { AdSlot } from '@/components/admin/AdSlotFormModal';
import type { Ad } from '@/components/admin/AdFormModal';

interface SlotWithAds extends AdSlot {
  assignedAds: Ad[];
}

interface PresetSlot {
  position: string;
  name: string;
  description: string;
  width: number;
  height: number;
}

interface PageGroup {
  page: string;
  slots: PresetSlot[];
}

const PRESET_SLOTS: PageGroup[] = [
  {
    page: '首页',
    slots: [
      { position: 'home_top', name: '首页顶部', description: '分类菜单下方，内容列表上方', width: 728, height: 90 },
    ],
  },
  {
    page: '成人专区',
    slots: [
      { position: 'adult_top', name: '成人页顶部', description: '分类菜单下方，内容列表上方', width: 728, height: 90 },
    ],
  },
  {
    page: '搜索页',
    slots: [
      { position: 'search_top', name: '搜索页顶部', description: '搜索框下方，搜索结果上方', width: 728, height: 90 },
    ],
  },
  {
    page: '详情页',
    slots: [
      { position: 'detail_middle', name: '详情页中部', description: '简介下方，播放按钮上方', width: 728, height: 90 },
    ],
  },
  {
    page: '播放页',
    slots: [
      { position: 'play_bottom', name: '播放页底部', description: '视频信息下方', width: 728, height: 90 },
    ],
  },
  {
    page: '个人中心',
    slots: [
      { position: 'profile_middle', name: '个人中心中部', description: '金币区域下方，菜单列表上方', width: 728, height: 90 },
    ],
  },
];

export default function AdminAdSlotsPage() {
  const { getAccessToken } = useAdminAuth();
  const [slots, setSlots] = useState<Map<string, SlotWithAds>>(new Map());
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningPosition, setAssigningPosition] = useState<string | null>(null);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const [slotsRes, adsRes] = await Promise.all([
        fetch('/api/admin/ads/slots', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ads?enabledOnly=false', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        const slotsMap = new Map<string, SlotWithAds>();
        
        await Promise.all(
          (slotsData.data || []).map(async (slot: AdSlot) => {
            const assignedRes = await fetch(`/api/admin/ads/slots/${slot.id}/assign`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const assignedData = assignedRes.ok ? await assignedRes.json() : { data: [] };
            slotsMap.set(slot.position, { ...slot, assignedAds: assignedData.data || [] });
          })
        );
        setSlots(slotsMap);
      }

      if (adsRes.ok) {
        const adsData = await adsRes.json();
        setAllAds(adsData.data || []);
      }
    } catch (err) {
      setError('网络错误');
      console.error('Fetch slots error:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchData();
  }, [fetchData]);


  const handleToggleSlot = async (preset: PresetSlot, currentSlot: SlotWithAds | undefined) => {
    const token = getAccessToken();
    if (!token) return;
    
    setTogglingSlot(preset.position);
    
    try {
      if (currentSlot) {
        // Toggle existing slot
        const res = await fetch(`/api/admin/ads/slots/${currentSlot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...currentSlot, enabled: !currentSlot.enabled }),
        });
        if (res.ok) {
          setSlots(prev => {
            const newMap = new Map(prev);
            const slot = newMap.get(preset.position);
            if (slot) newMap.set(preset.position, { ...slot, enabled: !slot.enabled });
            return newMap;
          });
        }
      } else {
        // Create new slot
        const res = await fetch('/api/admin/ads/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: preset.name,
            position: preset.position,
            width: preset.width,
            height: preset.height,
            rotationStrategy: 'random',
            enabled: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSlots(prev => {
            const newMap = new Map(prev);
            newMap.set(preset.position, { ...data.data, assignedAds: [] });
            return newMap;
          });
        }
      }
    } catch (err) {
      console.error('Toggle slot error:', err);
    } finally {
      setTogglingSlot(null);
    }
  };

  const handleOpenAssign = (position: string) => {
    setAssigningPosition(position);
    setAssignModalOpen(true);
  };

  const handleAssignAd = async (adId: string) => {
    const token = getAccessToken();
    if (!token || !assigningPosition) return;
    
    const slot = slots.get(assigningPosition);
    if (!slot) return;

    try {
      const res = await fetch(`/api/admin/ads/slots/${slot.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adId, priority: 0 }),
      });

      if (res.ok) {
        const ad = allAds.find(a => a.id === adId);
        if (ad) {
          setSlots(prev => {
            const newMap = new Map(prev);
            const s = newMap.get(assigningPosition);
            if (s) newMap.set(assigningPosition, { ...s, assignedAds: [...s.assignedAds, ad] });
            return newMap;
          });
        }
        setAssignModalOpen(false);
      }
    } catch (err) {
      console.error('Assign ad error:', err);
    }
  };

  const handleRemoveAd = async (position: string, adId: string) => {
    const token = getAccessToken();
    if (!token) return;
    
    const slot = slots.get(position);
    if (!slot) return;

    try {
      const res = await fetch(`/api/admin/ads/slots/${slot.id}/assign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adId }),
      });

      if (res.ok) {
        setSlots(prev => {
          const newMap = new Map(prev);
          const s = newMap.get(position);
          if (s) newMap.set(position, { ...s, assignedAds: s.assignedAds.filter(a => a.id !== adId) });
          return newMap;
        });
      }
    } catch (err) {
      console.error('Remove ad error:', err);
    }
  };

  const getAvailableAds = () => {
    if (!assigningPosition) return [];
    const slot = slots.get(assigningPosition);
    const assignedIds = new Set(slot?.assignedAds.map(ad => ad.id) || []);
    return allAds.filter(ad => !assignedIds.has(ad.id) && !ad.deleted);
  };

  const getAssigningSlotName = () => {
    if (!assigningPosition) return '';
    for (const group of PRESET_SLOTS) {
      const preset = group.slots.find(s => s.position === assigningPosition);
      if (preset) return preset.name;
    }
    return assigningPosition;
  };


  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <h1 className="text-xl font-semibold mb-4">广告位管理</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <h1 className="text-xl font-semibold mb-4">广告位管理</h1>
        <div className="text-center text-red-500 py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">广告位管理</h1>
          <p className="text-sm text-foreground/50 mt-1">按页面配置广告位，启用后可分配广告</p>
        </div>
        <Link href="/console-x9k2m/settings/ads" className="btn-secondary px-4 py-2 text-sm">
          返回广告管理
        </Link>
      </div>

      <div className="space-y-6">
        {PRESET_SLOTS.map(group => (
          <div key={group.page} className="bg-surface rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-surface-secondary/50 border-b border-surface-secondary">
              <h2 className="font-medium">{group.page}</h2>
            </div>
            
            <div className="divide-y divide-surface-secondary">
              {group.slots.map(preset => {
                const slot = slots.get(preset.position);
                const isEnabled = slot?.enabled ?? false;
                const isToggling = togglingSlot === preset.position;
                
                return (
                  <div key={preset.position} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm">{preset.name}</h3>
                          <span className="text-xs text-foreground/40 font-mono">{preset.position}</span>
                        </div>
                        <p className="text-xs text-foreground/50">{preset.description}</p>
                        <p className="text-xs text-foreground/40 mt-1">尺寸: {preset.width}×{preset.height}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isEnabled && (
                          <button
                            onClick={() => handleOpenAssign(preset.position)}
                            className="p-2 rounded-lg hover:bg-surface-secondary text-foreground/60 hover:text-primary"
                            title="分配广告"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleToggleSlot(preset, slot)}
                          disabled={isToggling}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            isEnabled ? 'bg-primary' : 'bg-foreground/20'
                          } ${isToggling ? 'opacity-50' : ''}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            isEnabled ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                    
                    {isEnabled && slot && (
                      <div className="mt-3 pt-3 border-t border-surface-secondary/50">
                        {slot.assignedAds.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-foreground/50">已分配广告 ({slot.assignedAds.length})</p>
                            {slot.assignedAds.map(ad => (
                              <div key={ad.id} className="flex items-center justify-between bg-surface-secondary/50 rounded px-3 py-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-12 h-8 bg-surface rounded overflow-hidden flex-shrink-0">
                                    {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />}
                                  </div>
                                  <span className="text-sm truncate">{ad.title}</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveAd(preset.position, ad.id)}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-foreground/40 hover:text-red-500"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-foreground/40 text-center py-2">暂无分配广告，点击 + 添加</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>


      {/* Assign Ad Modal */}
      {assignModalOpen && assigningPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" onClick={() => setAssignModalOpen(false)}>
          <div className="bg-background rounded-t-xl lg:rounded-lg p-5 w-full lg:max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">分配广告到「{getAssigningSlotName()}」</h2>
            
            {getAvailableAds().length === 0 ? (
              <div className="text-center py-8 text-foreground/50">
                <p>没有可分配的广告</p>
                <p className="text-xs mt-1">请先在广告管理中创建广告</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getAvailableAds().map(ad => (
                  <div 
                    key={ad.id} 
                    className="flex items-center justify-between bg-surface rounded-lg p-3 hover:bg-surface-secondary cursor-pointer"
                    onClick={() => handleAssignAd(ad.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-10 bg-surface-secondary rounded overflow-hidden flex-shrink-0">
                        {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ad.title}</p>
                        <p className="text-xs text-foreground/50">{ad.enabled ? '启用中' : '已禁用'}</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={() => setAssignModalOpen(false)} className="btn-secondary w-full py-2.5 mt-4">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
