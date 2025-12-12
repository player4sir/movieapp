'use client';

export interface AgeVerificationGateProps {
  onConfirm: () => void;
  onDecline: () => void;
}

/**
 * Age verification gate component
 * Displays a confirmation dialog requiring users to verify their age
 * before accessing adult content.
 */
export function AgeVerificationGate({ onConfirm, onDecline }: AgeVerificationGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 p-6 bg-surface rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-red-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            年龄验证
          </h2>
          <p className="text-foreground/60 text-sm leading-relaxed">
            此区域包含成人内容，仅限18岁及以上用户访问。
            请确认您已年满18周岁。
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="btn-primary w-full"
            aria-label="确认年满18岁"
          >
            我已年满18岁
          </button>
          <button
            onClick={onDecline}
            className="w-full py-3 px-4 rounded-xl text-foreground/60 
              bg-surface-secondary hover:bg-surface-secondary/80 
              transition-colors font-medium"
            aria-label="离开此页面"
          >
            离开
          </button>
        </div>

        <p className="mt-4 text-xs text-foreground/40 text-center">
          点击&ldquo;我已年满18岁&rdquo;即表示您确认已达到法定年龄
        </p>
      </div>
    </div>
  );
}
