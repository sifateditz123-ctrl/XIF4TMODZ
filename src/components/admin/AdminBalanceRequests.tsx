import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CheckCircle2, UserCog, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { BalanceRequestRecord } from '../../types/store';

export default function AdminBalanceRequests() {
  const [requests, setRequests] = useState<BalanceRequestRecord[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');

  useEffect(() => {
    const q = query(
      collection(db, 'balanceRequests'),
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
        console.error('Balance requests listener error:', err);
        toast.error('Failed to load balance requests');
      }
    );
  }, []);

  const handleApprove = async (req: BalanceRequestRecord) => {
    try {
      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, 'balanceRequests', req.id);
        const userRef = doc(db, 'users', req.userId);
        const txRef = doc(collection(db, 'transactions'));

        tx.update(reqRef, {
          status: 'approved',
          processedAt: serverTimestamp(),
        });
        tx.update(userRef, {
          walletBalance: increment(Number(req.amountBdt)),
        });
        tx.set(txRef, {
          userId: req.userId,
          type: 'topup',
          title: `Top-Up Approved (${req.method.toUpperCase()})`,
          amountBdt: Number(req.amountBdt),
          method: req.method,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });
      toast.success(`Credited ৳${req.amountBdt} to ${req.userEmail}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
      handleFirestoreError(err, OperationType.WRITE, `balanceRequests/${req.id}`);
    }
  };

  const handleReject = async (req: BalanceRequestRecord) => {
    try {
      await updateDoc(doc(db, 'balanceRequests', req.id), {
        status: 'rejected',
        processedAt: serverTimestamp(),
      });
      toast.success('Request rejected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
      handleFirestoreError(err, OperationType.UPDATE, `balanceRequests/${req.id}`);
    }
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(adjustAmount);
    const trimmedEmail = targetEmail.trim();
    if (!trimmedEmail || !amt || amt <= 0) {
      toast.error('Enter valid email and positive amount');
      return;
    }

    try {
      let snap = await getDocs(
        query(collection(db, 'users'), where('email', '==', trimmedEmail))
      );
      if (snap.empty && trimmedEmail !== trimmedEmail.toLowerCase()) {
        snap = await getDocs(
          query(
            collection(db, 'users'),
            where('email', '==', trimmedEmail.toLowerCase())
          )
        );
      }
      if (snap.empty) {
        toast.error('No user found with that exact email');
        return;
      }

      const userDoc = snap.docs[0];
      const delta = adjustType === 'add' ? amt : -amt;

      await runTransaction(db, async (tx) => {
        const fresh = await tx.get(userDoc.ref);
        const curr = Number(fresh.data()?.walletBalance || 0);
        const next = Math.max(0, curr + delta);
        tx.update(userDoc.ref, { walletBalance: next });
        tx.set(doc(collection(db, 'transactions')), {
          userId: userDoc.id,
          type: adjustType === 'add' ? 'admin_credit' : 'admin_debit',
          title:
            adjustType === 'add'
              ? 'Admin Manual Balance Credit'
              : 'Admin Manual Balance Deduction',
          amountBdt: delta,
          method: 'admin',
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });

      toast.success(
        `${adjustType === 'add' ? 'Added' : 'Deducted'} ৳${amt} for ${trimmedEmail}`
      );
      setAdjustAmount('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Balance adjustment failed');
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleManualAdjust}
        className="cyber-card space-y-3 rounded-2xl p-4 sm:p-5"
      >
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <UserCog className="h-4 w-4 text-cyan-400" />
          Manual User Wallet Add / Deduct
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="email"
            required
            placeholder="User Email Address"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="sm:col-span-2 rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="number"
            required
            min={1}
            placeholder="Amount (BDT)"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <div className="flex gap-2">
            <select
              value={adjustType}
              onChange={(e) =>
                setAdjustType(e.target.value === 'deduct' ? 'deduct' : 'add')
              }
              className="rounded-xl border border-slate-700 bg-[#090b14] px-2 py-2.5 text-xs font-bold text-white"
            >
              <option value="add">+ Add</option>
              <option value="deduct">- Deduct</option>
            </select>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-3 py-2 text-xs font-bold text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-white">
          Add Balance Requests ({requests.length})
        </h3>

        {requests.length === 0 ? (
          <div className="cyber-card rounded-2xl p-8 text-center text-xs text-slate-500">
            No balance requests found.
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="cyber-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-white">
                  {r.userEmail} ·{' '}
                  <span className="font-mono text-emerald-400">
                    ৳{r.amountBdt}
                  </span>
                </p>
                <p className="text-slate-400">
                  Method:{' '}
                  <strong className="uppercase text-cyan-300">{r.method}</strong>{' '}
                  · TrxID:{' '}
                  <strong className="font-mono text-amber-300">{r.trxId}</strong>
                  {r.senderNumber && ` · Sender: ${r.senderNumber}`}
                </p>
                <p className="text-[11px] font-bold uppercase text-purple-300">
                  Status: {r.status}
                </p>
              </div>

              {r.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(r)}
                    className="flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(r)}
                    className="flex min-h-[38px] items-center gap-1 rounded-xl bg-rose-600/30 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600/50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
