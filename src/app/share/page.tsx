'use client';

import { useRouter } from 'next/navigation';
import { ReferralStats } from '@/components/referral/ReferralStats';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChevronLeft } from 'lucide-react';

export default function SharePage() {
    const router = useRouter();

    return (
        <>
            <Sidebar />

            <div className="h-screen flex flex-col bg-background overflow-hidden lg:pl-64">
                {/* Header */}
                <header className="fixed top-0 left-0 lg:left-64 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-surface-secondary">
                    <div className="flex items-center h-14 px-4 pt-safe-top">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-surface active:bg-surface-secondary"
                            aria-label="返回"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h1 className="flex-1 text-center text-lg font-bold pr-8">邀请赚钱</h1>
                    </div>
                </header>

                <main className="flex-1 overflow-auto pt-14 pb-4 bg-surface dark:bg-background">
                    <div className="max-w-screen-md mx-auto min-h-full p-4">
                        <ReferralStats />
                    </div>
                </main>
            </div>
        </>
    );
}
