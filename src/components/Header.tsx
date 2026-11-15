import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, ShieldCheck, Wallet, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import type { CurrencyCode } from '../types/store';
import { checkIsAdmin, formatCurrency } from '../utils/storeLogic';

const CURRENCIES: { code: CurrencyCode; symbol: string }[] = [
  { code: 'BDT', symbol: '৳' },
  { code: 'USDT', symbol: '$' },
  { code: 'INR', symbol: '₹' },
];

export default function Header() {
  const { siteSettings, currency, changeCurrency } = useStore();
  const { user, userProfile, openAuthModal } = useAuth();
  const location = useLocation();

  const isAdmin = checkIsAdmin(
    user?.email,
    userProfile?.role,
    siteSettings.adminEmails,
    import.meta.env.VITE_ADMIN_EMAIL
  );

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-purple-500/20 bg-[#07080f]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:gap-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-cyan-500 shadow-neon-purple">
            <Zap className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="truncate font-display text-xs font-extrabold tracking-wider text-white sm:text-base">
            {siteSettings.storeName || 'SIFAT MODZ'}
          </span>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Currency selector"
            className="flex rounded-xl border border-slate-800 bg-[#0f1221] p-0.5 text-[11px] font-bold"
          >
            {CURRENCIES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => changeCurrency(item.code)}
                aria-pressed={currency === item.code}
                className={`min-h-[34px] rounded-lg px-2 py-1 whitespace-nowrap shrink-0 transition-colors ${
                  currency === item.code
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">{item.code} </span>
                {item.symbol}
              </button>
            ))}
          </div>

          {user ? (
            <Link
              to="/add-balance"
              aria-label="Wallet balance"
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-cyan-300 whitespace-nowrap shrink-0 transition hover:bg-cyan-500/20"
            >
              <Wallet className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span>
                {formatCurrency(
                  userProfile?.walletBalance || 0,
                  currency,
                  siteSettings
                )}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3.5 py-1.5 text-xs font-bold text-white whitespace-nowrap shrink-0 shadow-neon-purple transition hover:brightness-110"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Login</span>
            </button>
          )}

          {isAdmin && location.pathname !== '/admin' && (
            <Link
              to="/admin"
              className="hidden min-h-[38px] items-center gap-1.5 rounded-xl border border-fuchsia-500/45 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-fuchsia-300 whitespace-nowrap shrink-0 transition hover:bg-fuchsia-500/25 sm:flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
