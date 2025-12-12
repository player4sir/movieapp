import { ReferralStats } from '@/components/referral/ReferralStats';

export default function SharePage() {
    return (
        <div className="min-h-screen bg-black pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-center">
                <h1 className="text-white font-medium text-lg">邀请赚钱</h1>
            </header>

            <main className="p-4 safe-area-inset">
                <ReferralStats />
            </main>
        </div>
    );
}
