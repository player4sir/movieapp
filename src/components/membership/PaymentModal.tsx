'use client';

/**
 * PaymentModal Component
 * Displays payment QR codes
 * Allows transaction note input
 * Submits order via Remark Code flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks';
import { MembershipPlan, MembershipPlans } from './MembershipPlans';

interface PaymentQRCode {
  id: string;
  paymentType: 'wechat' | 'alipay';
  imageUrl: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'select-plan' | 'select-method' | 'payment' | 'success';
type PaymentMethod = 'qrcode' | 'coin';

const PAYMENT_TYPE_CONFIG = {
  wechat: { label: '康讯支付', color: 'bg-primary', icon: '💳' },
  alipay: { label: '康讯支付', color: 'bg-primary', icon: '💳' },
};

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { getAccessToken } = useAuth();

  const [step, setStep] = useState<Step>('select-plan');
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  // const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qrcode');
  const [qrcodes, setQrcodes] = useState<PaymentQRCode[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'wechat' | 'alipay'>('wechat');

  // Order state
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [remarkCode, setRemarkCode] = useState<string | null>(null);

  // UI state
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('select-plan');
    setSelectedPlan(null);
    // setPaymentMethod('qrcode');
    setOrderId(null);
    setOrderNo(null);
    setRemarkCode(null);
    setError(null);
  }, []);

  const fetchQRCodes = useCallback(async () => {
    try {
      const response = await fetch('/api/membership/qrcodes');
      if (response.ok) {
        const data = await response.json();
        setQrcodes(Array.isArray(data.qrcodes) ? data.qrcodes : []);
      }
    } catch (err) {
      console.error('Failed to fetch QR codes:', err);
    }
  }, []);

  const fetchCoinBalance = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const response = await fetch('/api/user/coins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCoinBalance(data.balance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch coin balance:', err);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isOpen) {
      fetchQRCodes();
      fetchCoinBalance();
      resetState();
    }
  }, [isOpen, fetchQRCodes, fetchCoinBalance, resetState]);

  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setError(null);
  };

  const handleProceedToMethod = () => {
    if (selectedPlan) setStep('select-method');
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    if (method === 'coin') {
      handleCoinExchange();
    } else {
      setStep('payment');
    }
  };

  const handleCoinExchange = async () => {
    if (!selectedPlan) return;

    const token = getAccessToken();
    if (!token) return;

    if (coinBalance < selectedPlan.coinPrice) {
      setError(`金币不足，需要 ${selectedPlan.coinPrice} 金币，当前余额 ${coinBalance}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/exchange', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '兑换失败');
      }

      setStep('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '兑换失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan) return;

    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentType: selectedPaymentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '创建订单失败');
      }

      setOrderId(data.order.id);
      setOrderNo(data.order.orderNo);
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
    setError(null);

    try {
      const response = await fetch(`/api/membership/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // No params needed for "I have paid"
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '提交失败');
      }

      setStep('success');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentQRCode = qrcodes.find(q => q.paymentType === selectedPaymentType);

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
            {step === 'select-plan' && '选择会员套餐'}
            {step === 'select-method' && '选择支付方式'}
            {step === 'payment' && '扫码支付'}
            {step === 'success' && '开通成功'}
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

          {/* Step 1: Select Plan */}
          {step === 'select-plan' && (
            <MembershipPlans
              selectedPlanId={selectedPlan?.id}
              onSelectPlan={handleSelectPlan}
            />
          )}

          {/* Step 2: Select Payment Method */}
          {step === 'select-method' && selectedPlan && (
            <div>
              {/* Order Summary */}
              <div className="bg-surface rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-foreground/60">套餐</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground/60">时长</span>
                  <span>{selectedPlan.duration >= 30 ? `${Math.floor(selectedPlan.duration / 30)}个月` : `${selectedPlan.duration}天`}</span>
                </div>
              </div>

              {/* Payment Type Selection */}
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

              <div className="border-t border-surface-secondary my-4"></div>

              {/* Coin Exchange Option */}
              <button
                onClick={() => handleSelectMethod('coin')}
                disabled={coinBalance < selectedPlan.coinPrice || loading}
                className="w-full p-4 bg-surface rounded-xl flex items-center justify-between active:opacity-80 border border-transparent hover:border-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-lg">🪙</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">金币兑换</div>
                    <div className="text-xs text-foreground/50">
                      当前余额: {coinBalance} 金币
                      {coinBalance < selectedPlan.coinPrice && <span className="text-red-400 ml-1">(不足)</span>}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-yellow-500">
                  {selectedPlan.coinPrice} 金币
                </div>
              </button>
            </div>
          )}

          {/* Step 3: Payment Display (QR + Remark Code) */}
          {step === 'payment' && selectedPlan && currentQRCode && (
            <div className="flex flex-col items-center">
              <div className="w-full bg-surface rounded-lg p-4 mb-4 flex justify-between items-center">
                <span className="text-foreground/60">支付金额</span>
                <span className={`text-2xl font-bold ${selectedPlan.memberLevel === 'vip' ? 'text-yellow-500' : 'text-purple-400'}`}>
                  ¥{(selectedPlan.price / 100).toFixed(2)}
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

          {/* Step 4: Success matches original */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">提交成功!</h3>
              <p className="text-foreground/60 mb-2">
                订单号: {orderNo}
              </p>
              <p className="text-foreground/50 text-sm">
                系统确认款项后将自动到账 (约1-3分钟)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-secondary shrink-0">
          {step === 'select-plan' && (
            <button
              onClick={handleProceedToMethod}
              disabled={!selectedPlan}
              className="w-full py-3 bg-primary text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedPlan ? '下一步' : '请选择套餐'}
            </button>
          )}

          {step === 'select-method' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select-plan')}
                className="flex-1 py-3 bg-surface text-foreground font-medium rounded-lg"
              >
                返回
              </button>
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
                onClick={() => setStep('select-method')}
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
            <button
              onClick={onClose}
              className="w-full py-3 bg-surface text-foreground font-medium rounded-lg"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
