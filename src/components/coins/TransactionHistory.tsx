'use client';

/**
 * TransactionHistory Component
 * Displays paginated transaction list with filters
 * 
 * Requirements: 4.1 - Display paginated list of transactions
 * Requirements: 4.2 - Show type, amount, balanceAfter, timestamp
 * Requirements: 4.3 - Filter by type
 * Requirements: 4.4 - Filter by date range
 */

import { useState, useEffect } from 'react';
import { useCoins, TransactionType, TransactionFilters } from '@/hooks';

interface TransactionHistoryProps {
  className?: string;
}

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  recharge: '充值',
  checkin: '签到',
  exchange: '兑换',
  consume: '消费',
  adjust: '调整',
};

const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  recharge: 'text-green-400',
  checkin: 'text-blue-400',
  exchange: 'text-purple-400',
  consume: 'text-red-400',
  adjust: 'text-yellow-400',
};

export function TransactionHistory({ className = '' }: TransactionHistoryProps) {
  const {
    transactions,
    transactionsPagination,
    transactionsLoading,
    transactionsError,
    fetchTransactions,
  } = useCoins();

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch transactions on mount and when filters/page change
  useEffect(() => {
    fetchTransactions(currentPage, filters);
  }, [currentPage, filters, fetchTransactions]);


  const handleTypeFilter = (type: TransactionType | '') => {
    setFilters(prev => ({
      ...prev,
      type: type || undefined,
    }));
    setCurrentPage(1);
  };

  const handleDateFilter = (startDate: string, endDate: string) => {
    setFilters(prev => ({
      ...prev,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    if (amount > 0) return `+${amount}`;
    return amount.toString();
  };

  return (
    <div className={`${className}`}>
      {/* Header with filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">交易记录</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          <FilterIcon className="w-4 h-4" />
          筛选
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-3">
          {/* Type filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">交易类型</label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleTypeFilter(e.target.value as TransactionType | '')}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            >
              <option value="">全部类型</option>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">开始日期</label>
              <input
                type="date"
                value={filters.startDate?.split('T')[0] || ''}
                onChange={(e) => handleDateFilter(
                  e.target.value ? new Date(e.target.value).toISOString() : '',
                  filters.endDate || ''
                )}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">结束日期</label>
              <input
                type="date"
                value={filters.endDate?.split('T')[0] || ''}
                onChange={(e) => handleDateFilter(
                  filters.startDate || '',
                  e.target.value ? new Date(e.target.value).toISOString() : ''
                )}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Clear filters */}
          {(filters.type || filters.startDate || filters.endDate) && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              清除筛选
            </button>
          )}
        </div>
      )}


      {/* Loading state */}
      {transactionsLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
        </div>
      )}

      {/* Error state */}
      {transactionsError && !transactionsLoading && (
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">{transactionsError}</p>
          <button
            onClick={() => fetchTransactions(currentPage, filters)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty state */}
      {!transactionsLoading && !transactionsError && transactions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          暂无交易记录
        </div>
      )}

      {/* Transaction list */}
      {!transactionsLoading && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-gray-800 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${TRANSACTION_TYPE_COLORS[tx.type]}`}>
                    {TRANSACTION_TYPE_LABELS[tx.type]}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatDate(tx.createdAt)}
                  </span>
                </div>
                {tx.description && (
                  <p className="text-gray-400 text-sm mt-1">{tx.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className={`font-medium ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatAmount(tx.amount)}
                </div>
                <div className="text-gray-500 text-xs">
                  余额: {tx.balanceAfter}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {transactionsPagination && transactionsPagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-gray-400 text-sm">
            {currentPage} / {transactionsPagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(transactionsPagination.totalPages, p + 1))}
            disabled={currentPage === transactionsPagination.totalPages}
            className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

// Filter icon component
function FilterIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export default TransactionHistory;
