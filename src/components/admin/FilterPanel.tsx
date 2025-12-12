'use client';

import { useState, useCallback, useEffect } from 'react';
import type { UserGroupSummary } from '@/types/admin';
import type { MemberLevel } from '@/types/auth';

export type UserStatus = 'active' | 'disabled';

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UserStatus;
  memberLevel?: MemberLevel;
  groupId?: string;
}

export interface FilterPanelProps {
  filters: UserListParams;
  groups: UserGroupSummary[];
  onChange: (filters: UserListParams) => void;
  onClear: () => void;
  activeCount: number;
  onManageGroups?: () => void;
}

export function FilterPanel({
  filters,
  groups,
  onChange,
  onClear,
  activeCount,
  onManageGroups,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = useCallback(
    (key: keyof UserListParams, value: string | undefined) => {
      onChange({
        ...filters,
        [key]: value || undefined,
        page: 1,
      });
    },
    [filters, onChange]
  );

  // Debounce search input
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        handleFilterChange('search', searchTerm);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, filters.search, handleFilterChange]);

  return (
    <div className="bg-surface rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium text-foreground">筛选</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-foreground/70 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-4 space-y-3 border-t border-surface-secondary/50 pt-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索用户名 / 昵称..."
              className="w-full bg-surface-secondary/30 border border-transparent focus:border-primary/20 focus:bg-surface-secondary/50 focus:ring-0 rounded-xl px-4 py-2.5 text-sm transition-all"
            />
          </div>

          {/* Status and Member Level in a row */}
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value as UserStatus | undefined)}
              className="w-full bg-surface-secondary/30 border border-transparent focus:border-primary/20 focus:bg-surface-secondary/50 focus:ring-0 rounded-xl px-4 py-2.5 text-sm appearance-none transition-all"
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
            </select>

            <select
              value={filters.memberLevel || ''}
              onChange={(e) => handleFilterChange('memberLevel', e.target.value as MemberLevel | undefined)}
              className="w-full bg-surface-secondary/30 border border-transparent focus:border-primary/20 focus:bg-surface-secondary/50 focus:ring-0 rounded-xl px-4 py-2.5 text-sm appearance-none transition-all"
            >
              <option value="">全部等级</option>
              <option value="free">免费</option>
              <option value="vip">VIP</option>
              <option value="svip">SVIP</option>
            </select>
          </div>

          {/* User Group */}
          <div className="flex gap-2">
            <select
              value={filters.groupId || ''}
              onChange={(e) => handleFilterChange('groupId', e.target.value)}
              className="flex-1 bg-surface-secondary/30 border border-transparent focus:border-primary/20 focus:bg-surface-secondary/50 focus:ring-0 rounded-xl px-4 py-2.5 text-sm appearance-none transition-all"
            >
              <option value="">全部用户组</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {onManageGroups && (
              <button
                type="button"
                onClick={onManageGroups}
                className="px-4 py-2.5 bg-surface-secondary/30 hover:bg-surface-secondary/50 text-foreground/70 hover:text-foreground rounded-xl transition-colors text-sm font-medium"
                title="管理用户组"
              >
                管理
              </button>
            )}
          </div>

          {/* Clear button */}
          {activeCount > 0 && (
            <button
              onClick={onClear}
              className="w-full py-2.5 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors"
            >
              清除筛选 ({activeCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
