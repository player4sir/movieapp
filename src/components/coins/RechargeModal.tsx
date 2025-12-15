'use client';

/**
 * RechargeModal Component
 * Displays available recharge packages and handles payment flow
 * Matches PaymentModal flow: Package -> Method -> QR -> Proof -> Success
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks';

interface RechargePackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface PaymentQRCode {
  id: string;
  paymentType: 'wechat' | 'alipay';
  imageUrl: string;
}

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  onSuccess?: () => void;
}

type Step = 'select-package' | 'select-method' | 'payment' | 'success';
const PAYMENT_TYPE_CONFIG = {
  wechat: { label: '康讯支付', color: 'bg-primary', icon: '💳' },
  alipay: { label: '康讯支付', color: 'bg-primary', icon: '💳' },
};

export function RechargeModal({ isOpen, onClose, currentBalance = 0, onSuccess }: RechargeModalProps) {
  const { getAccessToken } = useAuth();

  const [step, setStep] = useState<Step>('select-package');
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [qrcodes, setQrcodes] = useState<PaymentQRCode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'wechat' | 'alipay'>('wechat');

  const [orderId, setOrderId] = useState<string | null>(null);
  // const [orderNo, setOrderNo] = useState<string | null>(null);
  const [remarkCode, setRemarkCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      fetchQRCodes();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep('select-package');
    setOrderId(null);
    // setOrderNo(null);
    setRemarkCode(null);
    setError(null);
  };

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coins/packages');
      if (res.ok) {
        const data = await res.json();
        const pkgList = Array.isArray(data.packages) ? data.packages : [];
        setPackages(pkgList);
        const popular = pkgList.find((p: RechargePackage) => p.popular);
        if (popular) setSelectedId(popular.id);
        else if (pkgList.length > 0) setSelectedId(pkgList[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch packages:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCodes = async () => {
    try {
      const response = await fetch('/api/membership/qrcodes'); // Reuse same QR codes
      if (response.ok) {
        const data = await response.json();
        setQrcodes(Array.isArray(data.qrcodes) ? data.qrcodes : []);
      }
    } catch (err) {
      console.error('Failed to fetch QR codes:', err);
    }
  };

  const selectedPackage = packages.find(p => p.id === selectedId);
  const currentQRCode = qrcodes.find(q => q.paymentType === selectedPaymentType);

  const handleProceedToMethod = () => {
    if (selectedPackage) setStep('select-method');
  };

  // const handleSelectMethod = () => {
  //   // Just updates UI state via selection buttons, user clicks button to Create Order
  // };

  const handleCreateOrder = async () => {
    if (!selectedPackage) return;
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/coins/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPackage.coins + (selectedPackage.bonus || 0),
          price: Math.round(selectedPackage.price * 100), // Frontend pkg price is Yuan, backend wants cents
          paymentType: selectedPaymentType,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '创建订单失败');

      setOrderId(data.order.id);
      // setOrderNo(data.order.orderNo);
      setRemarkCode(data.order.remarkCode); // Store remark code
      setStep('payment'); // Go to payment display step
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!orderId) return;
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/user/coins/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // No params needed for "I have paid"
        }),
      });

      if (!response.ok) throw new Error('提交失败');

      setStep('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-secondary shrink-0">
          <h2 className="text-lg font-semibold">
            {step === 'select-package' && '金币充值'}
            {step === 'select-method' && '选择支付方式'}
            {step === 'payment' && '扫码支付'}
            {step === 'success' && '充值成功'}
          </h2>
          <button onClick={onClose} className="p-1 text-foreground/50 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Select Package */}
          {step === 'select-package' && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-4 py-3 bg-surface rounded-lg">
                <CoinIcon className="w-5 h-5 text-yellow-500" />
                <span className="text-foreground/60">当前余额:</span>
                <span className="text-yellow-500 font-bold text-lg">{currentBalance}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {packages.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedId(pkg.id)}
                    className={`relative p-3 rounded-lg border-2 transition-all text-left ${selectedId === pkg.id
                      ? 'border-primary bg-primary/10'
                      : 'border-surface-secondary bg-surface hover:border-primary/50'
                      }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                        推荐
                      </span>
                    )}
                    <div className="flex items-center gap-1 mb-1">
                      <CoinIcon className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-yellow-500">{pkg.coins}</span>
                      {pkg.bonus ? (
                        <span className="text-xs text-green-500">+{pkg.bonus}</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-foreground/70">{pkg.name}</div>
                    <div className="text-lg font-bold text-primary mt-1">¥{pkg.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Method */}
          {step === 'select-method' && selectedPackage && (
            <div className="space-y-3">
              <div className="bg-surface rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-foreground/60">充值金额</span>
                  <span className="text-lg font-bold text-primary">¥{selectedPackage.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground/60">获得金币</span>
                  <span className="font-medium text-yellow-500">{selectedPackage.coins + (selectedPackage.bonus || 0)}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-foreground/60 mb-2">选择支付方式</div>
                <div className="flex gap-2">
                  {qrcodes.map(qr => {
                    const config = PAYMENT_TYPE_CONFIG[qr.paymentType];
                    return (
                      <button
                        key={qr.id}
                        onClick={() => setSelectedPaymentType(qr.paymentType)}
                        className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${selectedPaymentType === qr.paymentType
                          ? `${config.color} text-white`
                          : 'bg-surface text-foreground/60 border border-transparent hover:border-primary/30'
                          }`}
                      >
                        <span>{config.icon}</span>
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && selectedPackage && currentQRCode && (
            <div className="flex flex-col items-center">
              <div className="w-full bg-surface rounded-lg p-4 mb-4 flex justify-between items-center">
                <span className="text-foreground/60">支付金额</span>
                <span className="text-2xl font-bold text-primary">
                  ¥{selectedPackage.price.toFixed(2)}
                </span>
              </div>

              {/* Remark Code Display */}
              <div className="w-full bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 text-center">
                <div className="text-sm text-primary mb-1">请在支付时备注以下数字</div>
                <div className="text-3xl font-black text-primary tracking-widest my-2 select-all">
                  {remarkCode}
                </div>
                <div className="text-xs text-foreground/50">
                  * 这是确认您付款的重要凭证，请务必填写
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-lg p-4 flex flex-col items-center mb-4">
                <img
                  src={currentQRCode.imageUrl}
                  alt="Payment QR Code"
                  className="w-48 h-48 object-contain"
                />
                <p className="text-gray-600 text-sm mt-2">
                  使用{PAYMENT_TYPE_CONFIG[selectedPaymentType].label}扫码
                </p>
              </div>

              <div className="w-full text-center">
                <p className="text-xs text-foreground/40 mb-2">
                  支付备注填写示例：
                </p>
                <div className="text-xs text-foreground/60 bg-surface p-2 rounded inline-block">
                  {PAYMENT_TYPE_CONFIG[selectedPaymentType].label} APP &gt; 扫一扫 &gt; 输入金额 &gt; 添加备注 &gt; 输入 &quot;{remarkCode}&quot;
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">提交成功!</h3>
              <p className="text-foreground/60">系统确认款项后将自动到账 (约1-3分钟)</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-secondary shrink-0">
          {step === 'select-package' && (
            <button onClick={handleProceedToMethod} disabled={!selectedPackage} className="w-full py-3 bg-primary text-white font-medium rounded-lg disabled:opacity-50">下一步</button>
          )}
          {step === 'select-method' && (
            <div className="flex gap-3">
              <button onClick={() => setStep('select-package')} className="flex-1 py-3 bg-surface text-foreground font-medium rounded-lg">返回</button>
              <button
                onClick={handleCreateOrder}
                disabled={loading || !qrcodes.find(q => q.paymentType === selectedPaymentType)}
                className="flex-[2] py-3 bg-primary text-white font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? '创建订单...' : '获取支付二维码'}
              </button>
            </div>
          )}
          {step === 'payment' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select-method')} // Back allows re-selecting method, but order is already created. That's fine, new order will be created.
                className="flex-1 py-3 bg-surface text-foreground font-medium rounded-lg"
              >
                返回
              </button>
              <button
                onClick={handleSubmitProof}
                disabled={loading}
                className="flex-[2] py-3 bg-primary text-white font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? '提交中...' : '我已支付'}
              </button>
            </div>
          )}
          {step === 'success' && (
            <button onClick={onClose} className="w-full py-3 bg-surface text-foreground font-medium rounded-lg">完成</button>
          )}
        </div>

      </div>
    </div>
  );
}

function CoinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">¥</text>
    </svg>
  );
}

export default RechargeModal;
