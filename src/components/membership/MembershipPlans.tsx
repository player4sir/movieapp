'use client';

/**
 * MembershipPlans Component
 * Displays available plans with VIP/SVIP options
 * Shows prices and durations
 * Handles plan selection
 * 
 * Requirements: 1.1 - Display all available membership plans with prices and durations
 * Requirements: 1.4 - Show VIP and SVIP options with monthly, quarterly, and yearly durations
 */

import { useState, useEffect } from 'react';

export interface MembershipPlan {
  id: string;
  name: string;
  memberLevel: 'vip' | 'svip';
  duration: number;
  price: number;
  coinPrice: number;
  sortOrder: number;
}

interface MembershipPlansProps {
  selectedPlanId?: string;
  onSelectPlan: (plan: MembershipPlan) => void;
  className?: string;
}

const LEVEL_TABS = [
  { key: 'vip' as const, label: 'VIP会员', color: 'text-yellow-500', activeColor: 'bg-yellow-500' },
  { key: 'svip' as const, label: 'SVIP会员', color: 'text-purple-400', activeColor: 'bg-purple-500' },
];

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}年`;
  if (days >= 30) return `${Math.floor(days / 30)}个月`;
  return `${days}天`;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function MembershipPlans({ selectedPlanId, onSelectPlan, className = '' }: MembershipPlansProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<'vip' | 'svip'>('vip');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/plans');
      if (response.ok) {
        const data = await response.json();
        const planList = Array.isArray(data.plans) ? data.plans : [];
        setPlans(planList);
      } else {
        setError('获取套餐失败');
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans
    .filter(p => p.memberLevel === activeLevel)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.duration - b.duration);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex gap-2 mb-4">
          {[1, 2].map(i => (
            <div key={i} className="h-10 w-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button onClick={fetchPlans} className="text-primary text-sm underline">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Level Tabs */}
      <div className="flex gap-2 mb-4">
        {LEVEL_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveLevel(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeLevel === tab.key
                ? `${tab.activeColor} text-white`
                : 'bg-surface text-foreground/60 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-8 text-foreground/50">
          暂无可用套餐
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredPlans.map(plan => {
            const isSelected = selectedPlanId === plan.id;
            const levelColor = plan.memberLevel === 'vip' ? 'yellow' : 'purple';
            
            return (
              <button
                key={plan.id}
                onClick={() => onSelectPlan(plan)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? `border-${levelColor}-500 bg-${levelColor}-500/10`
                    : 'border-surface-secondary bg-surface hover:border-foreground/20'
                }`}
              >
                <div className="font-medium text-foreground mb-1">
                  {plan.name}
                </div>
                <div className="text-xs text-foreground/50 mb-2">
                  {formatDuration(plan.duration)}
                </div>
                <div className={`text-lg font-bold ${
                  plan.memberLevel === 'vip' ? 'text-yellow-500' : 'text-purple-400'
                }`}>
                  ¥{formatPrice(plan.price)}
                </div>
                <div className="text-xs text-foreground/40 mt-1">
                  或 {plan.coinPrice} 金币
                </div>
                
                {isSelected && (
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                    plan.memberLevel === 'vip' ? 'bg-yellow-500' : 'bg-purple-500'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MembershipPlans;
