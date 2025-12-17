'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface AdStats {
  adId: string;
  adTitle: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface SlotStats {
  slotId: string;
  slotName: string;
  position: string;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  adStats: AdStats[];
}

interface AllAdsStats {
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  ads: AdStats[];
}

type ViewMode = 'ads' | 'slots';

/**
 * Admin Ad Statistics Page
 * Display ad performance metrics
 * Date range filter
 * Slot-level aggregation view
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export default function AdminAdStatsPage() {
  const { getAccessToken } = useAdminAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('ads');
  const [adsStats, setAdsStats] = useState<AllAdsStats | null>(null);
  const [slotsStats, setSlotsStats] = useState<SlotStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const hasFetched = useRef(false);


  const fetchStats = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());
      const queryString = params.toString() ? `?${params.toString()}` : '';

      if (viewMode === 'ads') {
        const res = await fetch(`/api/admin/ads/stats${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setAdsStats(data.data);
        } else {
          setError('加载统计数据失败');
        }
      } else {
        // Fetch all slots first
        const slotsRes = await fetch('/api/admin/ads/slots', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          const slots = slotsData.data || [];

          // Fetch stats for each slot
          const statsPromises = slots.map(async (slot: { id: string }) => {
            const statsRes = await fetch(`/api/admin/ads/slots/${slot.id}/stats${queryString}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (statsRes.ok) {
              return await statsRes.json();
            }
            return null;
          });

          const statsResults = await Promise.all(statsPromises);
          setSlotsStats(statsResults.filter(Boolean).map(r => r.data));
        } else {
          setError('加载广告位数据失败');
        }
      }
    } catch (err) {
      setError('网络错误');
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, viewMode, startDate, endDate]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStats();
  }, [fetchStats]);

  const handleFilter = () => {
    hasFetched.current = false;
    fetchStats();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    hasFetched.current = false;
    setTimeout(fetchStats, 0);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    hasFetched.current = false;
    setTimeout(fetchStats, 0);
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatCtr = (ctr: number) => `${ctr.toFixed(2)}%`;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">广告统计</h1>
        <Link href="/console-x9k2m/settings/ads" className="btn-secondary px-4 py-2 text-sm">
          返回广告管理
        </Link>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleViewModeChange('ads')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewMode === 'ads' ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-secondary'
            }`}
        >
          按广告统计
        </button>
        <button
          onClick={() => handleViewModeChange('slots')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewMode === 'slots' ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-secondary'
            }`}
        >
          按广告位统计
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-surface rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-foreground/60 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-foreground/60 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="input py-1.5 text-sm"
            />
          </div>
          <button onClick={handleFilter} className="btn-primary px-4 py-1.5 text-sm">
            筛选
          </button>
          {(startDate || endDate) && (
            <button onClick={handleClearFilter} className="btn-secondary px-4 py-1.5 text-sm">
              清除
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : viewMode === 'ads' ? (
        <AdsStatsView stats={adsStats} formatNumber={formatNumber} formatCtr={formatCtr} />
      ) : (
        <SlotsStatsView stats={slotsStats} formatNumber={formatNumber} formatCtr={formatCtr} />
      )}
    </div>
  );
}


interface AdsStatsViewProps {
  stats: AllAdsStats | null;
  formatNumber: (num: number) => string;
  formatCtr: (ctr: number) => string;
}

function AdsStatsView({ stats, formatNumber, formatCtr }: AdsStatsViewProps) {
  if (!stats) {
    return (
      <div className="text-center py-12 bg-surface rounded-lg">
        <p className="text-foreground/50">暂无统计数据</p>
      </div>
    );
  }

  // Calculate max impressions for chart scaling
  const maxImpressions = Math.max(...stats.ads.map(ad => ad.impressions), 1);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-foreground/60 mb-1">总展示</p>
          <p className="text-2xl font-bold">{formatNumber(stats.totalImpressions)}</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-foreground/60 mb-1">总点击</p>
          <p className="text-2xl font-bold">{formatNumber(stats.totalClicks)}</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-foreground/60 mb-1">平均CTR</p>
          <p className="text-2xl font-bold">{formatCtr(stats.averageCtr)}</p>
        </div>
      </div>

      {/* Simple Bar Chart */}
      {stats.ads.length > 0 && (
        <div className="bg-surface rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">广告表现对比</h3>
          <div className="space-y-2">
            {stats.ads.slice(0, 5).map(ad => {
              const impressionPercent = (ad.impressions / maxImpressions) * 100;
              return (
                <div key={ad.adId} className="flex items-center gap-2">
                  <span className="w-24 text-xs truncate text-foreground/60">{ad.adTitle}</span>
                  <div className="flex-1 h-6 bg-surface-secondary rounded overflow-hidden relative">
                    <div
                      className="h-full bg-primary/80 transition-all duration-500"
                      style={{ width: `${impressionPercent}%` }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                      {formatNumber(ad.impressions)}
                    </span>
                  </div>
                  <span className="w-14 text-xs text-right text-green-500">{formatCtr(ad.ctr)}</span>
                </div>
              );
            })}
          </div>
          {stats.ads.length > 5 && (
            <p className="text-xs text-foreground/40 mt-2 text-center">显示前 5 条</p>
          )}
        </div>
      )}

      {/* Ads Table */}
      {stats.ads.length > 0 ? (
        <div className="bg-surface rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-secondary">
                  <th className="text-left p-3 font-medium">广告</th>
                  <th className="text-right p-3 font-medium">展示</th>
                  <th className="text-right p-3 font-medium">点击</th>
                  <th className="text-right p-3 font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {stats.ads.map(ad => (
                  <tr key={ad.adId} className="border-b border-surface-secondary last:border-0">
                    <td className="p-3">{ad.adTitle}</td>
                    <td className="p-3 text-right">{formatNumber(ad.impressions)}</td>
                    <td className="p-3 text-right">{formatNumber(ad.clicks)}</td>
                    <td className="p-3 text-right">{formatCtr(ad.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-surface rounded-lg">
          <p className="text-foreground/50">暂无广告数据</p>
        </div>
      )}
    </div>
  );
}

interface SlotsStatsViewProps {
  stats: SlotStats[];
  formatNumber: (num: number) => string;
  formatCtr: (ctr: number) => string;
}

function SlotsStatsView({ stats, formatNumber, formatCtr }: SlotsStatsViewProps) {
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  if (stats.length === 0) {
    return (
      <div className="text-center py-12 bg-surface rounded-lg">
        <p className="text-foreground/50">暂无广告位数据</p>
      </div>
    );
  }

  // Calculate totals
  const totalImpressions = stats.reduce((sum, s) => sum + s.totalImpressions, 0);
  const totalClicks = stats.reduce((sum, s) => sum + s.totalClicks, 0);
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-foreground/60 mb-1">总展示</p>
          <p className="text-2xl font-bold">{formatNumber(totalImpressions)}</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-foreground/60 mb-1">总点击</p>
          <p className="text-2xl font-bold">{formatNumber(totalClicks)}</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-foreground/60 mb-1">平均CTR</p>
          <p className="text-2xl font-bold">{formatCtr(averageCtr)}</p>
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-3">
        {stats.map(slot => (
          <div key={slot.slotId} className="bg-surface rounded-lg overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-surface-secondary/50 transition-colors"
              onClick={() => setExpandedSlot(expandedSlot === slot.slotId ? null : slot.slotId)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{slot.slotName}</h3>
                  <p className="text-xs text-foreground/50">{slot.position}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-foreground/60 text-xs">展示</p>
                    <p className="font-medium">{formatNumber(slot.totalImpressions)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground/60 text-xs">点击</p>
                    <p className="font-medium">{formatNumber(slot.totalClicks)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground/60 text-xs">CTR</p>
                    <p className="font-medium">{formatCtr(slot.averageCtr)}</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-foreground/40 transition-transform ${expandedSlot === slot.slotId ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expanded Ad Stats */}
            {expandedSlot === slot.slotId && slot.adStats.length > 0 && (
              <div className="border-t border-surface-secondary">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-secondary/30">
                      <th className="text-left p-3 font-medium text-xs">广告</th>
                      <th className="text-right p-3 font-medium text-xs">展示</th>
                      <th className="text-right p-3 font-medium text-xs">点击</th>
                      <th className="text-right p-3 font-medium text-xs">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slot.adStats.map(ad => (
                      <tr key={ad.adId} className="border-b border-surface-secondary/50 last:border-0">
                        <td className="p-3 text-foreground/80">{ad.adTitle}</td>
                        <td className="p-3 text-right text-foreground/80">{formatNumber(ad.impressions)}</td>
                        <td className="p-3 text-right text-foreground/80">{formatNumber(ad.clicks)}</td>
                        <td className="p-3 text-right text-foreground/80">{formatCtr(ad.ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expandedSlot === slot.slotId && slot.adStats.length === 0 && (
              <div className="border-t border-surface-secondary p-4 text-center text-foreground/50 text-sm">
                该广告位暂无广告数据
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
