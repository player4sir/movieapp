'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PaywallConfigSection } from '@/components/admin/PaywallConfigSection';

/**
 * Paywall Configuration Page
 * Dedicated page for content paywall settings
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export default function PaywallConfigPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/console-x9k2m/settings"
          className="p-2 -ml-2 text-foreground/60 hover:text-foreground rounded-lg hover:bg-surface-secondary/50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold">付费墙配置</h1>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.text}
        </div>
      )}

      {/* Paywall Config Section */}
      <PaywallConfigSection
        onShowToast={(text, type) => setMessage({ type, text })}
      />
    </div>
  );
}
