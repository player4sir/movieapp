'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

/**
 * Admin Settings Page
 * Dashboard-style grid layout for system configuration
 */

interface SettingCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function SettingCard({ href, title, description, icon, iconBgColor, iconColor }: SettingCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col p-5 bg-surface rounded-2xl border border-transparent hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconBgColor} ${iconColor} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <svg className="w-5 h-5 text-foreground/20 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-foreground/50 leading-relaxed">{description}</p>
    </Link>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-2">系统设置</h1>
        <p className="text-foreground/50">管理影视内容源、变现策略及系统参数</p>
      </div>

      {/* Content Management Group */}
      <section>
        <h2 className="text-sm font-bold text-foreground/40 uppercase tracking-wider mb-4 px-1">内容管理</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SettingCard
            href="/console-x9k2m/settings/resources"
            title="资源库浏览"
            description="浏览各数据源的影视资源列表，搜索并查看详细信息。"
            iconBgColor="bg-emerald-500/10"
            iconColor="text-emerald-500"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          <SettingCard
            href="/console-x9k2m/settings/sources"
            title="影视源管理"
            description="配置采集接口，管理数据源的启用状态、排序及分类。"
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-500"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Monetization Group */}
      <section>
        <h2 className="text-sm font-bold text-foreground/40 uppercase tracking-wider mb-4 px-1">变现与运营</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SettingCard
            href="/console-x9k2m/settings/coins"
            title="金币配置"
            description="设置签到奖励规则、VIP兑换比例及充值套餐价格。"
            iconBgColor="bg-yellow-500/10"
            iconColor="text-yellow-500"
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.3" />
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm1-5h-2v2h2v-2z" />
              </svg>
            }
          />
          <SettingCard
            href="/console-x9k2m/settings/paywall"
            title="付费墙配置"
            description="管理内容定价策略、非会员试看时长及 VIP 权益开关。"
            iconBgColor="bg-purple-500/10"
            iconColor="text-purple-500"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <SettingCard
            href="/console-x9k2m/settings/ads"
            title="广告管理"
            description="配置应用内广告位，管理横幅广告素材及查看投放统计。"
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-500"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            }
          />
          <SettingCard
            href="/console-x9k2m/settings/referral"
            title="推广配置"
            description="设置邀请奖励机制，管理邀请人与被邀请人的金币奖励。"
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-500"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>
      </section>

      <div className="pt-8 border-t border-dashed border-border/50 text-center">
        <p className="text-sm text-foreground/40">MovieShell Admin System v1.0</p>
      </div>
    </div>
  );
}
