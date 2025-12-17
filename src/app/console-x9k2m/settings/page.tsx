'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface SettingItemProps {
  href: string;
  title: string;
  icon: ReactNode;
  color: string;
}

function SettingItem({ href, title, icon, color }: SettingItemProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center p-4 bg-surface rounded-xl border border-transparent hover:border-primary/20 transition-all group"
    >
      <div className={`p-3 rounded-lg ${color} mb-2 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-center">{title}</span>
    </Link>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">系统设置</h1>

      {/* 内容管理 */}
      <section>
        <h2 className="text-xs font-medium text-foreground/40 uppercase mb-3">内容管理</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SettingItem
            href="/console-x9k2m/settings/resources"
            title="资源库"
            color="bg-emerald-500/10 text-emerald-500"
            icon={<IconDatabase />}
          />
          <SettingItem
            href="/console-x9k2m/settings/sources"
            title="影视源"
            color="bg-blue-500/10 text-blue-500"
            icon={<IconSource />}
          />
        </div>
      </section>

      {/* 变现运营 */}
      <section>
        <h2 className="text-xs font-medium text-foreground/40 uppercase mb-3">变现运营</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SettingItem
            href="/console-x9k2m/settings/coins"
            title="金币配置"
            color="bg-yellow-500/10 text-yellow-500"
            icon={<IconCoin />}
          />
          <SettingItem
            href="/console-x9k2m/settings/paywall"
            title="付费墙"
            color="bg-purple-500/10 text-purple-500"
            icon={<IconLock />}
          />
          <SettingItem
            href="/console-x9k2m/settings/ads"
            title="广告管理"
            color="bg-blue-500/10 text-blue-500"
            icon={<IconAd />}
          />
          <SettingItem
            href="/console-x9k2m/settings/referral"
            title="推广配置"
            color="bg-orange-500/10 text-orange-500"
            icon={<IconUsers />}
          />
          <SettingItem
            href="/console-x9k2m/settings/agent-levels"
            title="代理等级"
            color="bg-green-500/10 text-green-500"
            icon={<IconAgent />}
          />
        </div>
      </section>

      {/* 系统配置 */}
      <section>
        <h2 className="text-xs font-medium text-foreground/40 uppercase mb-3">系统配置</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SettingItem
            href="/console-x9k2m/settings/site"
            title="站点设置"
            color="bg-slate-500/10 text-slate-500"
            icon={<IconSettings />}
          />
          <SettingItem
            href="/console-x9k2m/settings/backup"
            title="数据备份"
            color="bg-rose-500/10 text-rose-500"
            icon={<IconBackup />}
          />
          <SettingItem
            href="/console-x9k2m/settings/faq"
            title="问答助手"
            color="bg-indigo-500/10 text-indigo-500"
            icon={<IconBot />}
          />
        </div>
      </section>
    </div>
  );
}

// 简洁图标组件
function IconDatabase() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

function IconSource() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-11h-2v2h2v-2z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function IconAd() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconBot() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function IconBackup() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002-2V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  );
}

function IconAgent() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

