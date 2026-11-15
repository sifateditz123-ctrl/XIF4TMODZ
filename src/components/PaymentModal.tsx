import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Loader2,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  processGatewayPurchase,
  processWalletPurchase,
} from '../services/orderService';
import type { CheckoutPayload, PaymentMethodId } from '../types/store';
import { convertFromBdt, formatCurrency } from '../utils/storeLogic';
import HowToPaySlider from './HowToPaySlider';

const PAYMENT_METHODS: { id: PaymentMethodId; name: string; sub: string }[] = [
  { id: 'wallet', name: 'Wallet', sub: 'Instant' },
  { id: 'bkash', name: 'bKash', sub: 'BDT' },
  { id: 'nagad', name: 'Nagad', sub: 'BDT' },
  { id: 'rocket', name: 'Rocket', sub: 'BDT' },
  { id: 'binance', name: 'Binance', sub: 'USDT' },
];

export default function PaymentModal({
  checkoutData,
  onClose,
}: {
  checkoutData: CheckoutPayload;
  onClose: () => void;
}) {
  const { siteSettings, currency } = useStore();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [method, setMethod] = useState<PaymentMethodId>('wallet');
  const [trxId, setTrxId] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!checkoutData || !user) return null;

  const { product, duration, quantity, coupon, discountBdt, totalAmountBdt } =
    checkoutData;

  const walletBalance = Number(userProfile?.walletBalance || 0);
  const insufficientWallet = walletBalance < totalAmountBdt;

  const getMethodAccount = () => {
    if (method === 'bkash') {
      return {
        number: siteSettings.bkashNumber,
        type: siteSettings.bkashType || 'Personal',
        payable: `৳${Math.round(totalAmountBdt)}`,
      };
    }
    if (method === 'nagad') {
      return {
        number: siteSettings.nagadNumber,
        type: siteSettings.nagadType || 'Personal',
        payable: `৳${Math.round(totalAmountBdt)}`,
      };
    }
    if (method === 'rocket') {
      return {
        number: siteSettings.rocketNumber,
        type: siteSettings.rocketType || 'Personal',
        payable: `৳${Math.round(totalAmountBdt)}`,
      };
    }
    return {
      number: siteSettings.binanceId,
      type: 'Pay ID',
      payable: `${convertFromBdt(totalAmountBdt, 'USDT', siteSettings)} USDT`,
    };
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    try {
      if (method === 'wallet') {
        const res = await processWalletPurchase({
          user,
          userProfile,
          product,
          duration,
          quantity,
          coupon,
          discountBdt,
          totalAmountBdt,
        });
        toast.success(
          res.status === 'completed'
            ? 'Payment complete! Key delivered to Orders.'
            : 'Order placed! Keys pending fulfillment.'
        );
        onClose();
        navigate('/orders');
      } else {
        const res = await processGatewayPurchase({
          user,
          userProfile,
          product,
          duration,
          quantity,
          coupon,
          discountBdt,
          totalAmountBdt,
          paymentMethod: method,
          trxId,
        });
        toast.success(
          res.status === 'completed'
            ? 'TrxID verified! Key delivered to Orders.'
            : 'TrxID submitted! Key will arrive after verification.'
        );
        onClose();
        navigate('/orders');
      }
    } catch (err) {
      let message = err instanceof Error ? err.message : 'Payment failed';
      if (message.startsWith('{')) {
        try {
          const parsed = JSON.parse(message);
          if (parsed?.error) message = parsed.error;
        } catch {
          // keep original message
        }
      }
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const accountInfo = getMethodAccount();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Checkout Gateway"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-4"
    >
      <div className="cyber-card cyber-glow-border max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Checkout Gateway
            </h2>
            <p className="text-xs text-slate-400">
              {product.name} · {duration.label} x{quantity}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout gateway"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">
            Total Payable
          </span>
          <span className="font-mono text-lg font-extrabold tabular-nums text-cyan-300">
            {formatCurrency(totalAmountBdt, currency, siteSettings)}
          </span>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Payment Method
          </span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`flex min-h-[50px] flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                  method === m.id
                    ? 'border-cyan-400 bg-cyan-500/15 text-white'
                    : 'border-slate-700/80 bg-[#090b14] text-slate-400 hover:border-purple-500/40'
                }`}
              >
                <span className="text-xs font-extrabold">{m.name}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-purple-300">
                  {m.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {method === 'wallet' ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-[#090b14] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Wallet className="h-4 w-4 text-cyan-400" />
                <span>Your Wallet Balance</span>
              </div>
              <span className="font-mono text-base font-bold tabular-nums text-cyan-400">
                {formatCurrency(walletBalance, currency, siteSettings)}
              </span>
            </div>

            {insufficientWallet ? (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                Insufficient balance. Top-up your wallet or select bKash, Nagad, Rocket, or Binance above.
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/add-balance');
                  }}
                  className="mt-2 block font-bold text-cyan-300 underline"
                >
                  Go to Add Balance →
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Instant automated key delivery enabled.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <HowToPaySlider method={method} accountType={accountInfo.type} />

            <div className="rounded-xl border border-slate-700 bg-[#090b14] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {method.toUpperCase()} ({accountInfo.type})
                  </span>
                  <p className="font-mono text-base font-bold text-white">
                    {accountInfo.number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(accountInfo.number, 'Number')}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-lg bg-purple-600/30 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-600/50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs">
                <span className="text-slate-400">Exact Amount to Send</span>
                <button
                  type="button"
                  onClick={() => copyText(accountInfo.payable, 'Amount')}
                  className="flex items-center gap-1 font-mono font-bold tabular-nums text-cyan-400"
                >
                  {accountInfo.payable} <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="checkout-trxid"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Transaction ID (TrxID)
              </label>
              <input
                id="checkout-trxid"
                type="text"
                placeholder="e.g. BKA94X72M1"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3.5 py-2.5 font-mono text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={
            processing ||
            (method === 'wallet' && insufficientWallet) ||
            (method !== 'wallet' && !trxId.trim())
          }
          onClick={handleConfirmPayment}
          className="mt-5 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 py-3 text-sm font-extrabold text-white shadow-neon-purple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {method === 'wallet'
            ? 'Pay with Wallet & Get Key'
            : 'Verify & Deliver Key'}
        </button>
      </div>
    </div>
  );
}
