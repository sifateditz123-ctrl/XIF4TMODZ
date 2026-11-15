import React, { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';

export default function AdminBanners() {
  const { banners, hasFirestoreBanners } = useStore();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('PROMO');
  const [imageUrl, setImageUrl] = useState('');
  const [order, setOrder] = useState('1');

  const firestoreBanners = hasFirestoreBanners ? banners : [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'banners'), {
        title,
        subtitle,
        badge,
        imageUrl,
        order: Number(order) || 1,
        active: true,
      });
      toast.success('Banner added!');
      setTitle('');
      setSubtitle('');
      setImageUrl('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add banner');
      handleFirestoreError(err, OperationType.CREATE, 'banners');
    }
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAdd}
        className="cyber-card space-y-3 rounded-2xl p-4 sm:p-5"
      >
        <h2 className="font-display text-sm font-bold text-white">
          Add Promotional Slider Banner
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            placeholder="Banner Headline"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="text"
            placeholder="Badge Text (e.g. HOT DEAL)"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="url"
            required
            placeholder="Background Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
          <input
            type="number"
            placeholder="Display Order"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
          />
        </div>
        <input
          type="text"
          placeholder="Subtitle description"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2.5 text-xs text-white"
        />
        <button
          type="submit"
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </form>

      <div className="space-y-3">
        {firestoreBanners.map((b) => (
          <div
            key={b.id}
            className="cyber-card flex items-center justify-between gap-3 rounded-2xl p-3.5 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={b.imageUrl}
                alt={b.title}
                referrerPolicy="no-referrer"
                className="h-12 w-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-display font-bold text-white">
                  {b.title}
                </p>
                <p className="truncate text-slate-400">{b.subtitle}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateDoc(doc(db, 'banners', b.id), { active: !b.active })
                }
                className={`rounded-lg px-2.5 py-1.5 font-bold ${
                  b.active
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {b.active ? 'Visible' : 'Hidden'}
              </button>
              <button
                type="button"
                aria-label={`Delete banner ${b.title}`}
                onClick={() => deleteDoc(doc(db, 'banners', b.id))}
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
