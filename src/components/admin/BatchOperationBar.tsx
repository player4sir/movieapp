'use client';

import { useState } from 'react';
import type { MemberLevel } from '@/types/auth';
import type { UserGroupSummary } from '@/types/admin';

export interface BatchOperationBarProps {
  selectedCount: number;
  onClear: () => void;
  onStatusChange: (status: 'active' | 'disabled') => void;
  onGroupChange: (groupId: string | null) => void;
  onMemberLevelChange: (level: MemberLevel) => void;
  groups?: UserGroupSummary[];
}

type ActionType = 'status' | 'group' | 'memberLevel' | null;

export function BatchOperationBar({
  selectedCount,
  onClear,
  onStatusChange,
  onGroupChange,
  onMemberLevelChange,
  groups = [],
}: BatchOperationBarProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null);

  if (selectedCount === 0) return null;

  const handleStatusChange = (status: 'active' | 'disabled') => {
    onStatusChange(status);
    setActiveAction(null);
  };

  const handleGroupChange = (groupId: string | null) => {
    onGroupChange(groupId);
    setActiveAction(null);
  };

  const handleMemberLevelChange = (level: MemberLevel) => {
    onMemberLevelChange(level);
    setActiveAction(null);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-surface-secondary shadow-lg safe-area-inset">
      <div className="px-4 py-3">
        {/* Selection info and clear button */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            已选择 <span className="text-primary">{selectedCount}</span> 个用户
          </span>
          <button
            onClick={onClear}
            className="text-sm text-foreground/70 hover:text-foreground transition-colors"
          >
            取消选择
          </button>
        </div>

        {/* Action buttons */}
        {activeAction === null && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveAction('status')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground rounded-lg hover:bg-foreground/10 transition-colors"
            >
              修改状态
            </button>
            <button
              onClick={() => setActiveAction('group')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground rounded-lg hover:bg-foreground/10 transition-colors"
            >
              分配用户组
            </button>
            <button
              onClick={() => setActiveAction('memberLevel')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground rounded-lg hover:bg-foreground/10 transition-colors"
            >
              修改等级
            </button>
          </div>
        )}

        {/* Status options */}
        {activeAction === 'status' && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveAction(null)}
              className="px-3 py-2 text-sm text-foreground/70"
            >
              ← 返回
            </button>
            <button
              onClick={() => handleStatusChange('active')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              启用
            </button>
            <button
              onClick={() => handleStatusChange('disabled')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              禁用
            </button>
          </div>
        )}

        {/* Group options */}
        {activeAction === 'group' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setActiveAction(null)}
              className="flex-shrink-0 px-3 py-2 text-sm text-foreground/70"
            >
              ← 返回
            </button>
            <button
              onClick={() => handleGroupChange(null)}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium bg-surface-secondary text-foreground rounded-lg hover:bg-foreground/10 transition-colors"
            >
              移除用户组
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupChange(group.id)}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: group.color, color: '#fff' }}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}

        {/* Member level options */}
        {activeAction === 'memberLevel' && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveAction(null)}
              className="px-3 py-2 text-sm text-foreground/70"
            >
              ← 返回
            </button>
            <button
              onClick={() => handleMemberLevelChange('free')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              免费
            </button>
            <button
              onClick={() => handleMemberLevelChange('vip')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
            >
              VIP
            </button>
            <button
              onClick={() => handleMemberLevelChange('svip')}
              className="flex-1 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              SVIP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
