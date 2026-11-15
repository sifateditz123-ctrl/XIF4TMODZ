import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { OrderRecord } from '../../types/store';
import { computeExpiryIso, maskDisplayName } from '../../utils/storeLogic';

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [manualModalOrder, setManualModalOrder] = useState<OrderRecord | null>(null);
  const [manualKeysText, setManualKeysText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setOrders(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<OrderRecord, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('Admin orders listener error:', err);
        toast.error('Failed to load orders: check admin verification.');
      }
    );
  }, []);

  const finalizeApproval = async (
    order: OrderRecord,
    deliveredKeys: string[],
    keyDocsToMarkSold: { ref: ReturnType<typeof doc> }[]
  ) => {
    const expiresAt = computeExpiryIso(Number(order.durationHours) || 24);

    try {
      await runTransaction(db, async (tx) => {
        for (const kDoc of keyDocsToMarkSold) {
          tx.update(kDoc.ref, {
            status: 'sold',
            soldToUid: order.userId,
            orderId: order.id,
            soldAt: serverTimestamp(),
          });
        }
        tx.update(doc(db, 'orders', order.id), {
          status: 'completed',
          deliveredKeys,
          expiresAt,
        });
        tx.update(doc(db, 'users', order.userId), {
          totalSpent: increment(Number(order.totalAmountBdt)),
          totalKeys: increment(Number(order.quantity)),
        });
      });

      await addDoc(collection(db, 'recentPurchases'), {
        displayNameMasked: maskDisplayName(order.userName || order.userEmail),
        productName: order.productName,
        productImage: order.productImage || '',
        durationLabel: order.durationLabel,
        quantity: order.quantity,
        amountBdt: Number(order.totalAmountBdt),
        paymentMethod: order.paymentMethod,
        createdAt: serverTimestamp(),
      });

      toast.success('Order approved & keys delivered!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
    }
  };

  const handleApproveAndDeliver = async (order: OrderRecord) => {
    try {
      const keysSnap = await getDocs(
        query(
          collection(db, 'licenseKeys'),
          where('productId', '==', order.productId),
          where('durationId', '==', order.durationId),
          where('status', '==', 'available'),
          limit(order.quantity)
        )
      );

      if (keysSnap.docs.length >= order.quantity) {
        const keys = keysSnap.docs.map((d) => String(d.data().keyValue));
        await finalizeApproval(order, keys, keysSnap.docs);
      } else {
        setManualKeysText('');
        setManualModalOrder(order);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualModalOrder) return;
    const keys = manualKeysText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (keys.length === 0) {
      toast.error('Enter at least one license key');
      return;
    }
    await finalizeApproval(manualModalOrder, keys, []);
    setManualModalOrder(null);
    setManualKeysText('');
  };

  const handleReject = async (order: OrderRecord) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'rejected' });
      toast.success('Order marked rejected');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const filtered = orders.filter((o) =>
    filter === 'all' ? true : o.status === filter
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-white">
          Manage Customer Orders ({filtered.length})
        </h2>
        <div className="flex gap-1.5 text-xs">
          {(['pending', 'completed', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 font-bold uppercase ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="cyber-card rounded-2xl p-8 text-center text-xs text-slate-500">
          No {filter} orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="cyber-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-white">
                    {o.productName}
                  </span>
                  <span className="text-slate-400">
                    {o.durationLabel} · x{o.quantity}
                  </span>
                </div>
                <p className="text-slate-400">
                  User: <strong className="text-slate-200">{o.userEmail}</strong>
                </p>
                <p className="text-slate-400 tabular-nums">
                  Method:{' '}
                  <strong className="uppercase text-cyan-300">
                    {o.paymentMethod}
                  </strong>{' '}
                  · TrxID:{' '}
                  <strong className="font-mono text-amber-300">{o.trxId}</strong>{' '}
                  · Amount:{' '}
                  <strong className="font-mono text-emerald-400">
                    ৳{o.totalAmountBdt}
                  </strong>
                </p>
                {o.deliveredKeys?.length > 0 && (
                  <p className="flex items-center gap-1 font-mono text-[11px] text-emerald-300">
                    <KeyRound className="h-3 w-3" /> {o.deliveredKeys.join(', ')}
                  </p>
                )}
              </div>

              {o.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveAndDeliver(o)}
                    className="flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Deliver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(o)}
                    className="flex min-h-[38px] items-center gap-1 rounded-xl bg-rose-600/30 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600/50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {manualModalOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Manual Key Delivery"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <form
            onSubmit={handleManualSubmit}
            className="cyber-card cyber-glow-border w-full max-w-md space-y-4 rounded-2xl p-5"
          >
            <h3 className="font-display text-base font-bold text-white">
              Manual Key Delivery
            </h3>
            <p className="text-xs text-slate-400">
              Inventory has fewer than {manualModalOrder.quantity} available key(s) for{' '}
              <strong className="text-white">{manualModalOrder.productName}</strong> ({manualModalOrder.durationLabel}). Enter the license key(s) below:
            </p>
            <textarea
              rows={3}
              required
              placeholder="Paste key(s), separated by comma or newline..."
              value={manualKeysText}
              onChange={(e) => setManualKeysText(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] p-3 font-mono text-xs text-emerald-300 outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setManualModalOrder(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
              >
                Deliver & Complete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
