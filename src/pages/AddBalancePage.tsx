import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  LogIn,
  Send,
  Wallet,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import HowToPaySlider from '../components/HowToPaySlider';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db } from '../firebase/config';
import { submitBalanceTopup } from '../services/orderService';
import type { BalanceRequestRecord } from '../types/store';
import { convertFromBdt, formatCurrency } from '../utils/storeLogic';

const TOPUP_METHODS = [
  { id: 'bkash', name: 'bKash' },
  { id: 'nagad', name: 'Nagad' },
  { id: 'rocket', name: 'Rocket' },
  { id: 'binance', name: 'Binance (USDT)' },
];

export default function AddBalancePage() {
  const { user, userProfile, openAuthModal } = useAuth();
  const { siteSettings, currency } = useStore();

  const [method, setMethod] = useState('bkash');
  const [amountBdt, setAmountBdt] = useState('500');
  const [trxId, setTrxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<BalanceRequestRecord[]>([]);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }
    const q = query(
      collection(db, 'balanceRequests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BalanceRequestRecord, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('Topup history listener error:', err);
      }
    );
  }, [user]);

  const getAccountDetails = () => {
    if (method === 'bkash') {
      return {
        label: `bKash (${siteSettings.bkashType || 'Personal'})`,
        number: siteSettings.bkashNumber,
        type: siteSettings.bkashType || 'Personal',
      };
    }
    if (method === 'nagad') {
      return {
        label: `Nagad (${siteSettings.nagadType || 'Personal'})`,
        number: siteSettings.nagadNumber,
        type: siteSettings.nagadType || 'Personal',
      };
    }
    if (method === 'rocket') {
      return {
        label: `Rocket (${siteSettings.rocketType || 'Personal'})`,
        number: siteSettings.rocketNumber,
        type: siteSettings.rocketType || 'Personal',
      };
    }
    return {
      label: 'Binance Pay ID',
      number: siteSettings.binanceId,
      type: 'Pay ID',
    };
  };

  const acc = getAccountDetails();
  const usdtEquivalent = convertFromBdt(
    Number(amountBdt) || 0,
    'USDT',
    siteSettings
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitBalanceTopup({
        user,
        userProfile,
        method,
        amountBdt: Number(amountBdt),
        trxId,
        senderNumber,
      });
      toast.success(
        res.status === 'approved'
          ? 'Wallet credited automatically!'
          : 'Top-up request submitted! Admin will approve shortly.'
      );
      setTrxId('');
      setSenderNumber('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Top-up submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(acc.number);
    toast.success('Copied to clipboard!');
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12">
        <div className="cyber-card cyber-glow-border rounded-2xl p-8 text-center">
          <Wallet className="mx-auto h-10 w-10 text-cyan-400" aria-hidden="true" />
          <h1 className="mt-3 font-display text-lg font-bold text-white">
            Sign In to Top-Up Wallet
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Add funds via bKash, Nagad, Rocket, or Binance Pay for instant one-tap purchases.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-neon-purple"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" /> Login / Register
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-3 pb-24 pt-4 sm:px-6">
      <div className="cyber-card cyber-glow-border flex items-center justify-between rounded-2xl p-4 sm:p-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available Wallet Balance
          </span>
          <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-cyan-400">
            {formatCurrency(
              userProfile?.walletBalance || 0,
              currency,
              siteSettings
            )}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
          <Wallet className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="cyber-card space-y-4 rounded-2xl p-4 sm:p-6"
      >
        <h1 className="font-display text-base font-bold text-white">
          Add Balance to Wallet
        </h1>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOPUP_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`min-h-[42px] rounded-xl border py-2.5 text-xs font-extrabold transition ${
                method === m.id
                  ? 'border-cyan-400 bg-cyan-500/15 text-white'
                  : 'border-slate-700 bg-[#090b14] text-slate-400 hover:text-white'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <HowToPaySlider method={method} accountType={acc.type} />

        <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-[#090b14] p-3.5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {acc.label}
            </span>
            <p className="font-mono text-base font-bold text-white">
              {acc.number}
            </p>
          </div>
          <button
            type="button"
            onClick={copyNumber}
            className="flex min-h-[38px] items-center gap-1.5 rounded-lg bg-purple-600/30 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-600/50"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>

        <div>
          <label
            htmlFor="topup-amount"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            Amount (BDT ৳)
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {[100, 300, 500, 1000, 2000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountBdt(String(preset))}
                className={`min-h-[34px] rounded-lg border px-3 py-1 font-mono text-xs font-bold tabular-nums transition ${
                  Number(amountBdt) === preset
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-slate-700 bg-[#090b14] text-slate-400'
                }`}
              >
                ৳{preset}
              </button>
            ))}
          </div>
          <input
            id="topup-amount"
            type="number"
            min={10}
            required
            value={amountBdt}
            onChange={(e) => setAmountBdt(e.target.value)}
            placeholder="Enter amount in BDT"
            className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3.5 py-2.5 font-mono text-sm font-bold text-white outline-none focus:border-cyan-400"
          />
          {method === 'binance' && (
            <p className="mt-1.5 text-xs font-semibold text-amber-300">
              Send exactly: <strong>{usdtEquivalent} USDT</strong> via Binance Pay
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="topup-sender"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Sender Number / Pay ID
            </label>
            <input
              id="topup-sender"
              type="text"
              placeholder="e.g. 017XXXXXXXX"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label
              htmlFor="topup-trxid"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Transaction ID (TrxID) *
            </label>
            <input
              id="topup-trxid"
              type="text"
              required
              placeholder="e.g. BKA83H29K"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3.5 py-2.5 font-mono text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 py-3 text-sm font-extrabold text-white shadow-neon-purple transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit Top-Up Request
        </button>
      </form>

      <section className="cyber-card rounded-2xl p-4 sm:p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-white">
          Your Top-Up History
        </h2>
        {requests.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            No balance top-up requests yet.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#090b14] px-3.5 py-2.5 text-xs"
              >
                <div>
                  <p className="font-bold uppercase text-white">
                    {req.method} · ৳{req.amountBdt}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    TrxID: <span className="font-mono text-cyan-300">{req.trxId}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${
                    req.status === 'approved'
                      ? 'text-emerald-400'
                      : req.status === 'rejected'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {req.status === 'approved' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : req.status === 'rejected' ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
