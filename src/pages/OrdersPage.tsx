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
  KeyRound,
  Loader2,
  LogIn,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { db } from '../firebase/config';
import type { OrderRecord } from '../types/store';
import { formatCurrency } from '../utils/storeLogic';

export default function OrdersPage() {
  const { user, openAuthModal } = useAuth();
  const { currency, siteSettings } = useStore();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<OrderRecord, 'id'>),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('License key copied!');
  };

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12">
        <div className="cyber-card cyber-glow-border rounded-2xl p-8 text-center">
          <KeyRound className="mx-auto h-10 w-10 text-cyan-400" aria-hidden="true" />
          <h1 className="mt-3 font-display text-lg font-bold text-white">
            Sign In to View Your Keys
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Access all your purchased license keys, copy credentials, and track expiry details.
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
    <main className="mx-auto max-w-4xl space-y-4 px-3 pb-24 pt-4 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-white sm:text-xl">
          My License Orders
        </h1>
        <span className="font-mono text-xs font-bold tabular-nums text-purple-300">
          {orders.length} Total
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="cyber-card rounded-2xl p-10 text-center">
          <KeyRound className="mx-auto h-9 w-9 text-slate-600" aria-hidden="true" />
          <p className="mt-3 font-display text-sm font-bold text-slate-300">
            No orders yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Visit the Store tab to purchase your first digital license key.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusColor =
              order.status === 'completed'
                ? 'text-emerald-400'
                : order.status === 'rejected'
                ? 'text-rose-400'
                : 'text-amber-400';

            const StatusIcon =
              order.status === 'completed'
                ? CheckCircle2
                : order.status === 'rejected'
                ? XCircle
                : Clock;

            const createdDate = order.createdAt?.toDate
              ? order.createdAt.toDate().toLocaleString()
              : 'Just now';

            const expiryDate = order.expiresAt
              ? new Date(order.expiresAt).toLocaleString()
              : 'Starts on approval';

            return (
              <article
                key={order.id}
                className="cyber-card rounded-2xl p-4 transition hover:border-purple-500/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-bold text-white sm:text-base">
                      {order.productName}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Duration:{' '}
                      <span className="font-bold text-cyan-300">
                        {order.durationLabel}
                      </span>
                      <span aria-hidden="true"> · </span>
                      Qty: {order.quantity}
                      <span aria-hidden="true"> · </span>
                      <span className="uppercase">{order.paymentMethod}</span>
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${statusColor}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {order.status}
                  </span>
                </div>

                {order.deliveredKeys && order.deliveredKeys.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-cyan-500/25 bg-[#070912] p-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                      Delivered License Key(s)
                    </span>
                    {order.deliveredKeys.map((keyVal, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[#0f1324] px-3 py-2"
                      >
                        <code className="truncate font-mono text-xs font-bold text-emerald-300 sm:text-sm">
                          {keyVal}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyKey(keyVal)}
                          className="flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-[#080a14] px-3 py-2 text-xs text-slate-400">
                    {order.status === 'pending'
                      ? `TrxID (${order.trxId}) is being verified. Keys will appear here automatically.`
                      : 'Order was rejected or cancelled.'}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                  <span>Purchased: {createdDate}</span>
                  <span>
                    Expires:{' '}
                    <strong className="text-slate-200">{expiryDate}</strong>
                  </span>
                  <span className="font-mono font-bold tabular-nums text-white">
                    {formatCurrency(order.totalAmountBdt, currency, siteSettings)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
