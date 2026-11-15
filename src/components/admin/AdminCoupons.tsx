import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { Coupon } from '../../types/store';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('10');
  const [maxUses, setMaxUses] = useState('0');

  useEffect(() => {
    const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setCoupons(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Coupon, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('Coupons listener error:', err);
      }
    );
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await addDoc(collection(db, 'coupons'), {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        maxUses: Number(maxUses) || 0,
        usageCount: 0,
        active: true,
        createdAt: serverTimestamp(),
      });
      toast.success('Coupon created!');
      setCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon');
      handleFirestoreError(err, OperationType.CREATE, 'coupons');
    }
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleCreate}
        className="cyber-card space-y-3 rounded-2xl p-4 sm:p-5"
      >
        <h2 className="font-display text-sm font-bold text-white">
          Create Promo / Coupon Code
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            required
            placeholder="Code (e.g. SIFAT20)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs font-bold uppercase text-white"
          />
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value === 'fixed' ? 'fixed' : 'percent')
            }
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs font-bold text-white"
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Discount (BDT ৳)</option>
          </select>
          <input
            type="number"
            required
            min={1}
            placeholder="Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="number"
            min={0}
            placeholder="Max Uses (0 = unlimited)"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
        </div>
        <button
          type="submit"
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="cyber-card flex items-center justify-between rounded-2xl p-4 text-xs"
          >
            <div>
              <p className="font-mono text-sm font-extrabold text-cyan-300">
                {c.code}
              </p>
              <p className="text-slate-400 tabular-nums">
                {c.type === 'percent' ? `${c.value}% OFF` : `৳${c.value} OFF`} ·
                Used: {c.usageCount || 0}
                {c.maxUses > 0 ? `/${c.maxUses}` : ' (Unlimited)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateDoc(doc(db, 'coupons', c.id), { active: !c.active })
                }
                className={`rounded-lg px-2.5 py-1.5 font-bold ${
                  c.active
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {c.active ? 'Active' : 'Paused'}
              </button>
              <button
                type="button"
                aria-label={`Delete coupon ${c.code}`}
                onClick={() => deleteDoc(doc(db, 'coupons', c.id))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
