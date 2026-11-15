import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Database, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import type { SiteSettings } from '../../types/store';
import { seedSampleStoreData } from '../../utils/seedData';

export default function AdminSettings() {
  const { siteSettings } = useStore();
  const [form, setForm] = useState<SiteSettings>(siteSettings);
  const [adminEmailsText, setAdminEmailsText] = useState(
    (siteSettings.adminEmails || []).join(', ')
  );
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setForm(siteSettings);
    setAdminEmailsText((siteSettings.adminEmails || []).join(', '));
  }, [siteSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'settings', 'site'),
        {
          ...form,
          usdtRate: Number(form.usdtRate) || 122,
          inrRate: Number(form.inrRate) || 1.42,
          adminEmails: adminEmailsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        { merge: true }
      );
      toast.success('Site settings saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedSampleStoreData();
      toast.success('Demo products, keys, banners & coupon seeded to Firestore!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="cyber-card space-y-5 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-white">
            Site Settings, Payment Numbers & Toggles
          </h2>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            Seed Demo Data to Firestore
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-400">
              Store Name
            </label>
            <input
              type="text"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-400">
              1 USDT = ? BDT
            </label>
            <input
              type="number"
              step="0.01"
              value={form.usdtRate}
              onChange={(e) =>
                setForm({ ...form, usdtRate: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-400">
              1 INR = ? BDT
            </label>
            <input
              type="number"
              step="0.01"
              value={form.inrRate}
              onChange={(e) =>
                setForm({ ...form, inrRate: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="bKash Number"
              value={form.bkashNumber}
              onChange={(e) =>
                setForm({ ...form, bkashNumber: e.target.value })
              }
              className="flex-1 rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
            />
            <select
              value={form.bkashType}
              onChange={(e) => setForm({ ...form, bkashType: e.target.value })}
              className="rounded-xl border border-slate-700 bg-[#090b14] px-2 text-xs text-white"
            >
              <option value="Personal">Personal</option>
              <option value="Merchant">Merchant</option>
              <option value="Agent">Agent</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nagad Number"
              value={form.nagadNumber}
              onChange={(e) =>
                setForm({ ...form, nagadNumber: e.target.value })
              }
              className="flex-1 rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
            />
            <select
              value={form.nagadType}
              onChange={(e) => setForm({ ...form, nagadType: e.target.value })}
              className="rounded-xl border border-slate-700 bg-[#090b14] px-2 text-xs text-white"
            >
              <option value="Personal">Personal</option>
              <option value="Merchant">Merchant</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Rocket Number"
              value={form.rocketNumber}
              onChange={(e) =>
                setForm({ ...form, rocketNumber: e.target.value })
              }
              className="flex-1 rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
            />
            <select
              value={form.rocketType}
              onChange={(e) => setForm({ ...form, rocketType: e.target.value })}
              className="rounded-xl border border-slate-700 bg-[#090b14] px-2 text-xs text-white"
            >
              <option value="Personal">Personal</option>
              <option value="Merchant">Merchant</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Binance Pay ID"
            value={form.binanceId}
            onChange={(e) => setForm({ ...form, binanceId: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="url"
            placeholder="Telegram Channel URL"
            value={form.telegramUrl}
            onChange={(e) => setForm({ ...form, telegramUrl: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
          />
          <input
            type="url"
            placeholder="WhatsApp Channel URL"
            value={form.whatsappUrl}
            onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })}
            className="rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-[#090b14] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">
                Official Android/Shop App Download Banner (Profile Page)
              </h3>
              <p className="text-[11px] text-slate-400">
                Toggle visibility ON or OFF on the user Profile page.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, showAppBanner: !form.showAppBanner })
              }
              className={`rounded-xl px-4 py-1.5 text-xs font-extrabold ${
                form.showAppBanner
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {form.showAppBanner ? 'ON (Visible)' : 'OFF (Hidden)'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="App Banner Title"
              value={form.appBannerTitle}
              onChange={(e) =>
                setForm({ ...form, appBannerTitle: e.target.value })
              }
              className="rounded-xl border border-slate-700 bg-[#0f1221] px-3 py-2 text-xs text-white"
            />
            <input
              type="url"
              placeholder="Official App APK Download URL"
              value={form.appDownloadUrl}
              onChange={(e) =>
                setForm({ ...form, appDownloadUrl: e.target.value })
              }
              className="rounded-xl border border-slate-700 bg-[#0f1221] px-3 py-2 text-xs text-white"
            />
          </div>
          <input
            type="text"
            placeholder="App Banner Subtitle"
            value={form.appBannerSubtitle}
            onChange={(e) =>
              setForm({ ...form, appBannerSubtitle: e.target.value })
            }
            className="w-full rounded-xl border border-slate-700 bg-[#0f1221] px-3 py-2 text-xs text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">
            Authorized Admin Emails (comma separated)
          </label>
          <input
            type="text"
            placeholder="admin@example.com, co-admin@example.com"
            value={adminEmailsText}
            onChange={(e) => setAdminEmailsText(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3 py-2 text-xs text-white"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-2.5 text-xs font-extrabold text-white"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save All Settings
        </button>
      </form>
    </div>
  );
}
