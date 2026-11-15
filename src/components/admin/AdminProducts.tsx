import React, { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { Product, ProductDuration } from '../../types/store';
import { DEFAULT_DURATIONS } from '../../utils/seedData';

interface ProductFormState {
  name: string;
  category: string;
  brand: string;
  imageUrl: string;
  platformBadges: string;
  apiConnected: boolean;
  setupVideoUrl: string;
  fileDownloadUrl: string;
  description: string;
  durations: ProductDuration[];
  active: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  category: 'NONROOT',
  brand: 'SIFAT',
  imageUrl: '',
  platformBadges: 'Android, iOS',
  apiConnected: true,
  setupVideoUrl: '',
  fileDownloadUrl: '',
  description: '',
  durations: DEFAULT_DURATIONS,
  active: true,
};

export default function AdminProducts() {
  const { products, usingDemoCatalog } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const firestoreProducts = usingDemoCatalog ? [] : products;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim().toUpperCase(),
        brand: form.brand.trim().toUpperCase(),
        imageUrl: form.imageUrl.trim(),
        platformBadges: form.platformBadges
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        apiConnected: Boolean(form.apiConnected),
        setupVideoUrl: form.setupVideoUrl.trim(),
        fileDownloadUrl: form.fileDownloadUrl.trim(),
        description: form.description.trim(),
        durations: form.durations.map((d) => ({
          ...d,
          hours: Number(d.hours) || 1,
          priceBdt: Number(d.priceBdt) || 0,
        })),
        active: Boolean(form.active),
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
        toast.success('Product updated!');
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('Product created!');
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const handleEdit = (prod: Product) => {
    setEditingId(prod.id);
    setForm({
      name: prod.name || '',
      category: prod.category || 'NONROOT',
      brand: prod.brand || 'SIFAT',
      imageUrl: prod.imageUrl || '',
      platformBadges: (prod.platformBadges || []).join(', '),
      apiConnected: prod.apiConnected ?? true,
      setupVideoUrl: prod.setupVideoUrl || '',
      fileDownloadUrl: prod.fileDownloadUrl || '',
      description: prod.description || '',
      durations: prod.durations?.length ? prod.durations : DEFAULT_DURATIONS,
      active: prod.active ?? true,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setConfirmDeleteId(null);
      toast.success('Product deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateDuration = (
    idx: number,
    field: keyof ProductDuration,
    val: string | number | boolean
  ) => {
    setForm((prev) => {
      const copy = [...prev.durations];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, durations: copy };
    });
  };

  const addCustomDuration = () => {
    setForm((prev) => ({
      ...prev,
      durations: [
        ...prev.durations,
        {
          id: `d_${Date.now()}`,
          label: '15 Days',
          hours: 360,
          priceBdt: 999,
          inStock: true,
        },
      ],
    }));
  };

  const removeDuration = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      durations: prev.durations.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="cyber-card space-y-4 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">
            {editingId ? 'Edit Product' : 'Add New Product / Panel'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="flex items-center gap-1 text-xs font-bold text-rose-400"
            >
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            required
            placeholder="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="text"
            required
            placeholder="Category (NONROOT, ROOT, IOS)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="text"
            placeholder="Brand Tag (e.g. SIFAT)"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="url"
            placeholder="Product Image URL"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="text"
            placeholder="Platforms (comma separated: Android, iOS)"
            value={form.platformBadges}
            onChange={(e) =>
              setForm({ ...form, platformBadges: e.target.value })
            }
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="url"
            placeholder="Setup Video URL (YouTube or MP4)"
            value={form.setupVideoUrl}
            onChange={(e) =>
              setForm({ ...form, setupVideoUrl: e.target.value })
            }
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="url"
            placeholder="File Download URL (APK/IPA/ZIP)"
            value={form.fileDownloadUrl}
            onChange={(e) =>
              setForm({ ...form, fileDownloadUrl: e.target.value })
            }
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
        </div>

        <textarea
          rows={2}
          placeholder="Short description..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
        />

        <div className="flex flex-wrap gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={form.apiConnected}
              onChange={(e) =>
                setForm({ ...form, apiConnected: e.target.checked })
              }
            />
            API Connected
          </label>
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Visible in Store
          </label>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-[#090b14] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-cyan-400">
              Durations, Prices (BDT) & Stock Status
            </span>
            <button
              type="button"
              onClick={addCustomDuration}
              className="flex items-center gap-1 rounded-lg bg-purple-600/30 px-2.5 py-1 text-[11px] font-bold text-purple-200"
            >
              <Plus className="h-3 w-3" /> Add Duration
            </button>
          </div>

          <div className="space-y-2">
            {form.durations.map((dur, idx) => (
              <div
                key={dur.id}
                className="grid grid-cols-12 items-center gap-2 rounded-lg bg-[#0f1221] p-2 text-xs"
              >
                <input
                  type="text"
                  value={dur.label}
                  onChange={(e) =>
                    updateDuration(idx, 'label', e.target.value)
                  }
                  placeholder="Label"
                  className="col-span-4 rounded border border-slate-700 bg-[#090b14] px-2 py-1 text-white"
                />
                <input
                  type="number"
                  value={dur.hours}
                  onChange={(e) =>
                    updateDuration(idx, 'hours', Number(e.target.value))
                  }
                  placeholder="Hrs"
                  title="Validity in hours"
                  className="col-span-2 rounded border border-slate-700 bg-[#090b14] px-2 py-1 font-mono text-white"
                />
                <input
                  type="number"
                  value={dur.priceBdt}
                  onChange={(e) =>
                    updateDuration(idx, 'priceBdt', Number(e.target.value))
                  }
                  placeholder="৳ BDT"
                  className="col-span-3 rounded border border-slate-700 bg-[#090b14] px-2 py-1 font-mono font-bold text-cyan-300"
                />
                <button
                  type="button"
                  onClick={() => updateDuration(idx, 'inStock', !dur.inStock)}
                  className={`col-span-2 rounded py-1 text-[10px] font-bold ${
                    dur.inStock
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {dur.inStock ? 'In Stock' : 'Out'}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${dur.label}`}
                  onClick={() => removeDuration(idx)}
                  className="col-span-1 flex justify-center text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2.5 text-xs font-extrabold text-white"
        >
          <Check className="h-4 w-4" />
          {editingId ? 'Save Changes' : 'Create Product'}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {firestoreProducts.length === 0 ? (
          <div className="cyber-card sm:col-span-2 rounded-2xl p-6 text-center text-xs text-slate-400">
            No products saved in Firestore yet. Add a product above or use "Seed Demo Data" in Settings.
          </div>
        ) : (
          firestoreProducts.map((p) => (
            <div
              key={p.id}
              className="cyber-card flex items-center justify-between rounded-2xl p-3.5"
            >
              <div className="flex items-center gap-3">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {p.category} · {(p.durations || []).length} durations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => handleEdit(p)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                {confirmDeleteId === p.id ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
