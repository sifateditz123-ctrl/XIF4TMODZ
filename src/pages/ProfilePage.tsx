import React, { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  Download,
  History,
  KeyRound,
  LogIn,
  LogOut,
  MessageCircle,
  Send,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db } from '../firebase/config';
import type { TransactionLog } from '../types/store';
import { checkIsAdmin, formatCurrency } from '../utils/storeLogic';

export default function ProfilePage() {
  const { user, userProfile, logout, openAuthModal } = useAuth();
  const { siteSettings, currency } = useStore();
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);

  const isAdmin = checkIsAdmin(
    user?.email,
    userProfile?.role,
    siteSettings.adminEmails,
    import.meta.env.VITE_ADMIN_EMAIL
  );

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TransactionLog, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('Transactions listener error:', err);
      }
    );
  }, [user]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out safely');
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12">
        <div className="cyber-card cyber-glow-border rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400">
            <LogIn className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-3 font-display text-lg font-bold text-white">
            Sign In to Your Profile
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            View your wallet balance, total spending, purchased keys, and official support channels.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-neon-purple"
          >
            Login / Register
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-3 pb-24 pt-4 sm:px-6">
      {/* User Info & Wallet Balance */}
      <section className="cyber-card cyber-glow-border rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={userProfile?.displayName || 'User avatar'}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl border-2 border-cyan-400/50 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 font-display text-xl font-extrabold text-white">
                {(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-bold text-white sm:text-lg">
                  {userProfile?.displayName || user.displayName || 'Member'}
                </h1>
                {isAdmin ? (
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-fuchsia-300">
                    · Admin
                  </span>
                ) : userProfile?.role === 'reseller' ? (
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                    · Reseller ({userProfile.resellerDiscountPct || 0}% OFF)
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              Wallet Balance
            </span>
            <span className="font-mono text-lg font-extrabold tabular-nums text-white">
              {formatCurrency(
                userProfile?.walletBalance || 0,
                currency,
                siteSettings
              )}
            </span>
          </div>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="mt-4 flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/15 py-2.5 text-xs font-extrabold text-fuchsia-200 transition hover:bg-fuchsia-500/25"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Open Admin Panel
          </Link>
        )}
      </section>

      {/* Official App Download Banner (Admin ON/OFF Toggle) */}
      {siteSettings.showAppBanner && (
        <section className="cyber-glow-border relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/60 via-[#12162b] to-cyan-900/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                <Smartphone className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-white">
                  {siteSettings.appBannerTitle || 'Download Official Shop App'}
                </h2>
                <p className="text-xs text-slate-300">
                  {siteSettings.appBannerSubtitle ||
                    'Get faster checkout & instant key alerts on Android.'}
                </p>
              </div>
            </div>
            <a
              href={siteSettings.appDownloadUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2 text-xs font-extrabold text-white shadow-neon-cyan transition hover:brightness-110"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Install App
            </a>
          </div>
        </section>
      )}

      {/* Account Summary Cards (Strictly ONLY Total Amount Spent & Total Keys Purchased) */}
      <section className="grid grid-cols-2 gap-3">
        <div className="cyber-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Wallet className="h-4 w-4 text-purple-400" aria-hidden="true" />
            <span>Total Amount Spent</span>
          </div>
          <p className="mt-2 font-mono text-xl font-extrabold tabular-nums text-white">
            ৳{Math.round(userProfile?.totalSpent || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">Lifetime BDT Spent</span>
        </div>

        <div className="cyber-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <KeyRound className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <span>Total Keys Purchased</span>
          </div>
          <p className="mt-2 font-mono text-xl font-extrabold tabular-nums text-white">
            {userProfile?.totalKeys || 0}
          </p>
          <span className="text-[11px] text-slate-500">Active & Past Keys</span>
        </div>
      </section>

      {/* Support Links (Editable from Admin) */}
      <section className="grid grid-cols-2 gap-3">
        <a
          href={siteSettings.telegramUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 py-3 text-xs font-extrabold text-sky-300 transition hover:bg-sky-500/20"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Telegram Channel
        </a>

        <a
          href={siteSettings.whatsappUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-xs font-extrabold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp Channel
        </a>
      </section>

      {/* Transaction History */}
      <section className="cyber-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-purple-400" aria-hidden="true" />
          <h2 className="font-display text-sm font-bold text-white">
            Transaction History
          </h2>
        </div>

        {transactions.length === 0 ? (
          <p className="py-5 text-center text-xs text-slate-500">
            No transactions recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const dt = tx.createdAt?.toDate
                ? tx.createdAt.toDate().toLocaleString()
                : 'Recent';
              const isCredit = Number(tx.amountBdt) >= 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#090b14] px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{tx.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {dt} · <span className="uppercase">{tx.method}</span> ·{' '}
                      <span className="uppercase text-cyan-400">{tx.status}</span>
                    </p>
                  </div>
                  <span
                    className={`font-mono text-xs font-extrabold tabular-nums ${
                      isCredit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isCredit ? '+' : '-'}
                    {formatCurrency(
                      Math.abs(tx.amountBdt),
                      currency,
                      siteSettings
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 py-3 text-sm font-extrabold text-rose-300 transition hover:bg-rose-500/20"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Log Out
      </button>
    </main>
  );
}
