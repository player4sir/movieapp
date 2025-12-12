'use client';

/**
 * Admin Panel Skeleton Components
 * 
 * Loading skeleton components for admin panel pages.
 * Provides visual feedback during data loading.
 * 
 * Requirements: 5.3 - Smooth transitions and loading states
 */

import React from 'react';

/**
 * Base skeleton pulse animation wrapper
 */
function SkeletonPulse({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children}
    </div>
  );
}

/**
 * Basic skeleton box element
 */
function SkeletonBox({
  className = '',
  width,
  height
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`bg-surface-secondary rounded ${className}`}
      style={{ width, height }}
    />
  );
}

// ==================== User List Skeleton ====================

export interface UserListSkeletonProps {
  /** Number of skeleton rows to display */
  count?: number;
  /** Whether to show checkbox column (batch mode) */
  showCheckbox?: boolean;
}

/**
 * User List Skeleton Component
 * 
 * Displays loading skeleton for user list items.
 * Requirements: 5.3
 */
export function UserListSkeleton({ count = 5, showCheckbox = false }: UserListSkeletonProps) {
  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      <div className="divide-y divide-surface-secondary">
        {Array.from({ length: count }).map((_, index) => (
          <UserListItemSkeleton key={index} showCheckbox={showCheckbox} />
        ))}
      </div>
    </div>
  );
}

/**
 * Single user list item skeleton
 */
function UserListItemSkeleton({ showCheckbox = false }: { showCheckbox?: boolean }) {
  return (
    <SkeletonPulse className="p-4 flex items-center gap-3">
      {/* Checkbox placeholder */}
      {showCheckbox && (
        <SkeletonBox className="w-5 h-5 rounded flex-shrink-0" />
      )}

      {/* User info */}
      <div className="flex-1 min-w-0">
        {/* Username and badges row */}
        <div className="flex items-center gap-2 mb-2">
          <SkeletonBox className="h-5 w-24" />
          <SkeletonBox className="h-4 w-12 rounded-full" />
        </div>
        {/* Secondary info row */}
        <div className="flex items-center gap-3">
          <SkeletonBox className="h-4 w-16" />
          <SkeletonBox className="h-4 w-10" />
          <SkeletonBox className="h-4 w-12" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 ml-4 flex-shrink-0">
        <SkeletonBox className="h-5 w-10" />
        <SkeletonBox className="h-5 w-10" />
        <SkeletonBox className="h-5 w-10" />
      </div>
    </SkeletonPulse>
  );
}

// ==================== Group Card Skeleton ====================

export interface GroupCardSkeletonProps {
  /** Number of skeleton cards to display */
  count?: number;
}

/**
 * Group Card Skeleton Component
 * 
 * Displays loading skeleton for user group cards.
 * Requirements: 5.3
 */
export function GroupCardSkeleton({ count = 3 }: GroupCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <GroupCardItemSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Single group card skeleton
 */
function GroupCardItemSkeleton() {
  return (
    <SkeletonPulse className="bg-surface rounded-lg p-4">
      {/* Header with color dot and name */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-4 h-4 rounded-full" />
          <SkeletonBox className="h-5 w-24" />
        </div>
        <SkeletonBox className="h-4 w-8" />
      </div>

      {/* Description */}
      <SkeletonBox className="h-4 w-full mb-2" />
      <SkeletonBox className="h-4 w-2/3 mb-4" />

      {/* Permission tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <SkeletonBox className="h-5 w-14 rounded" />
        <SkeletonBox className="h-5 w-16 rounded" />
        <SkeletonBox className="h-5 w-12 rounded" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-3 border-t border-surface-secondary">
        <SkeletonBox className="h-5 w-12" />
        <SkeletonBox className="h-5 w-12" />
        <SkeletonBox className="h-5 w-12 ml-auto" />
      </div>
    </SkeletonPulse>
  );
}

// ==================== Stats Card Skeleton ====================

export interface StatsCardSkeletonProps {
  /** Number of stat cards */
  count?: number;
}

/**
 * Stats Card Skeleton Component
 * 
 * Displays loading skeleton for statistics cards.
 * Requirements: 5.3
 */
export function StatsCardSkeleton({ count = 4 }: StatsCardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonPulse key={index} className="bg-surface rounded-lg p-4">
          <SkeletonBox className="h-8 w-16 mb-1" />
          <SkeletonBox className="h-4 w-20" />
        </SkeletonPulse>
      ))}
    </div>
  );
}

// ==================== User Detail Skeleton ====================

/**
 * User Detail Skeleton Component
 * 
 * Displays loading skeleton for user detail modal/page.
 * Requirements: 5.3
 */
export function UserDetailSkeleton() {
  return (
    <SkeletonPulse className="space-y-6">
      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <SkeletonBox className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <SkeletonBox className="h-6 w-32 mb-2" />
          <SkeletonBox className="h-4 w-24" />
        </div>
      </div>

      {/* Info sections */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <SkeletonBox className="h-3 w-16 mb-1" />
              <SkeletonBox className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats section */}
      <div>
        <SkeletonBox className="h-5 w-20 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonPulse key={i} className="bg-surface-secondary rounded-lg p-3">
              <SkeletonBox className="h-6 w-12 mb-1" />
              <SkeletonBox className="h-3 w-16" />
            </SkeletonPulse>
          ))}
        </div>
      </div>

      {/* Activity section */}
      <div>
        <SkeletonBox className="h-5 w-24 mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonPulse key={i} className="flex items-center gap-2 p-2">
              <SkeletonBox className="w-5 h-5 rounded" />
              <SkeletonBox className="h-4 flex-1" />
              <SkeletonBox className="h-3 w-16" />
            </SkeletonPulse>
          ))}
        </div>
      </div>
    </SkeletonPulse>
  );
}

// ==================== Table Skeleton ====================

export interface TableSkeletonProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Whether to show header */
  showHeader?: boolean;
}

/**
 * Table Skeleton Component
 * 
 * Generic table loading skeleton.
 * Requirements: 5.3
 */
export function TableSkeleton({ rows = 5, columns = 4, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      {showHeader && (
        <SkeletonPulse className="p-4 border-b border-surface-secondary flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBox key={i} className="h-4 flex-1" />
          ))}
        </SkeletonPulse>
      )}
      <div className="divide-y divide-surface-secondary">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <SkeletonPulse key={rowIndex} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBox key={colIndex} className="h-5 flex-1" />
            ))}
          </SkeletonPulse>
        ))}
      </div>
    </div>
  );
}

// ==================== Session List Skeleton ====================

/**
 * Session List Skeleton Component
 * 
 * Displays loading skeleton for user session list.
 * Requirements: 5.3
 */
export function SessionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonPulse key={index} className="bg-surface-secondary rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <SkeletonBox className="w-5 h-5 rounded" />
                <SkeletonBox className="h-5 w-32" />
                {index === 0 && <SkeletonBox className="h-4 w-16 rounded-full" />}
              </div>
              <SkeletonBox className="h-3 w-48 mb-1" />
              <SkeletonBox className="h-3 w-36" />
            </div>
            <SkeletonBox className="h-8 w-16 rounded" />
          </div>
        </SkeletonPulse>
      ))}
    </div>
  );
}

const SkeletonComponents = {
  UserListSkeleton,
  GroupCardSkeleton,
  StatsCardSkeleton,
  UserDetailSkeleton,
  TableSkeleton,
  SessionListSkeleton,
};

export default SkeletonComponents;
