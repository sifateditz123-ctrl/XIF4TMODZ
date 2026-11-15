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
} from 'firebase/firestore';
import { Key, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { LicenseKeyRecord } from '../../types/store';

export default function AdminKeys() {
  const { products, usingDemoCatalog } = useStore();
  const [keys, setKeys] = useState<LicenseKeyRecord[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedDurId, setSelectedDurId] = useState('');
  const [bulkKeys, setBulkKeys] = useState('');
  const [filterStatus, setFilterStatus] = useState<'available' | 'sold' | 'all'>('available');

  const firestoreProducts = usingDemoCatalog ? [] : products;

  useEffect(() => {
    if (firestoreProducts.length > 0 && !selectedProdId) {
      setSelectedProdId(firestoreProducts[0].id);
      setSelectedDurId(firestoreProducts[0].durations?.[0]?.id || '');
    }
  }, [firestoreProducts, selectedProdId]);

  useEffect(() => {
    const q = query(collection(db, 'licenseKeys'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setKeys(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<LicenseKeyRecord, 'id'>),
          }))
        );
      },
      (err) => {
        console.error('License keys listener error:', err);
        toast.error('Failed to load license keys');
      }
    );
  }, []);

  const currentProduct = firestoreProducts.find((p) => p.id === selectedProdId);
  const currentDuration = currentProduct?.durations?.find(
    (d) => d.id === selectedDurId
  );

  const handleUploadKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !currentDuration) {
      toast.error('Create or seed Firestore products first');
      return;
    }
    const lines = bulkKeys
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error('Paste at least one license key');
      return;
    }

    try {
      for (const k of lines) {
        await addDoc(collection(db, 'licenseKeys'), {
          productId: currentProduct.id,
          productName: currentProduct.name,
          durationId: currentDuration.id,
          durationLabel: currentDuration.label,
          keyValue: k,
          status: 'available',
          createdAt: serverTimestamp(),
        });
      }
      toast.success(`Uploaded ${lines.length} key(s)!`);
      setBulkKeys('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'licenseKeys');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'licenseKeys', id));
      toast.success('Key removed');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `licenseKeys/${id}`);
    }
  };

  const filteredKeys = keys.filter((k) =>
    filterStatus === 'all' ? true : k.status === filterStatus
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleUploadKeys}
        className="cyber-card space-y-4 rounded-2xl p-4 sm:p-6"
      >
        <h2 className="font-display text-base font-bold text-white">
          Upload License Key Inventory
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={selectedProdId}
            onChange={(e) => {
              const pid = e.target.value;
              setSelectedProdId(pid);
              const prod = firestoreProducts.find((p) => p.id === pid);
              setSelectedDurId(prod?.durations?.[0]?.id || '');
            }}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs font-bold text-white"
          >
            {firestoreProducts.length === 0 && (
              <option value="">No Firestore products yet</option>
            )}
            {firestoreProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDurId}
            onChange={(e) => setSelectedDurId(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs font-bold text-white"
          >
            {(currentProduct?.durations || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} (৳{d.priceBdt})
              </option>
            ))}
          </select>
        </div>

        <textarea
          rows={4}
          placeholder="Paste license keys here (one key per line)..."
          value={bulkKeys}
          onChange={(e) => setBulkKeys(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-[#090b14] p-3 font-mono text-xs text-emerald-300 outline-none focus:border-cyan-400"
        />

        <button
          type="submit"
          className="flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2.5 text-xs font-extrabold text-white"
        >
          <Plus className="h-4 w-4" /> Upload Keys to Stock
        </button>
      </form>

      <div className="cyber-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-white">
            <Key className="h-4 w-4 text-cyan-400" /> Inventory ({filteredKeys.length})
          </h3>
          <div className="flex gap-1.5 text-xs">
            {(['available', 'sold', 'all'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredKeys.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No {filterStatus} keys found.
            </p>
          ) : (
            filteredKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#090b14] px-3 py-2 text-xs"
              >
                <div>
                  <code className="font-mono font-bold text-emerald-300">
                    {k.keyValue}
                  </code>
                  <p className="text-[11px] text-slate-400">
                    {k.productName} · {k.durationLabel} ·{' '}
                    <span
                      className={
                        k.status === 'available'
                          ? 'text-cyan-400'
                          : 'text-amber-400'
                      }
                    >
                      {k.status.toUpperCase()}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete key ${k.keyValue}`}
                  onClick={() => handleDelete(k.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
