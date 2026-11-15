import React, { useState } from 'react';
import {
  ArrowLeft,
  Image,
  Key,
  Package,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminBalanceRequests from '../components/admin/AdminBalanceRequests';
import AdminBanners from '../components/admin/AdminBanners';
import AdminCoupons from '../components/admin/AdminCoupons';
import AdminKeys from '../components/admin/AdminKeys';
import AdminOrders from '../components/admin/AdminOrders';
import AdminProducts from '../components/admin/AdminProducts';
import AdminSettings from '../components/admin/AdminSettings';
import AdminUsers from '../components/admin/AdminUsers';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { checkIsAdmin } from '../utils/storeLogic';

const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'balances', label: 'Balances', icon: Wallet },
  { id: 'users', label: 'Admins & Resellers', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'keys', label: 'License Keys', icon: Key },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type AdminTabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const { user, userProfile, loading, openAuthModal } = useAuth();
  const { siteSettings } = useStore();
  const [activeTab, setActiveTab] = useState<AdminTabId>('orders');

  const isAdmin = checkIsAdmin(
    user?.email,
    userProfile?.role,
    siteSettings.adminEmails,
    import.meta.env.VITE_ADMIN_EMAIL
  );

  if (loading) {
    return (
      <div className="py-20 text-center font-display text-sm text-cyan-400">
        Verifying Admin Clearance...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="cyber-card cyber-glow-border rounded-2xl p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-400" aria-hidden="true" />
          <h1 className="mt-3 font-display text-lg font-bold text-white">
            Restricted Admin Area
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Access is limited to authorized Admin emails and roles.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="min-h-[40px] rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-2 text-xs font-bold text-white"
              >
                Sign In
              </button>
            )}
            <Link
              to="/"
              className="flex min-h-[40px] items-center rounded-xl border border-slate-700 px-5 py-2 text-xs font-bold text-slate-300"
            >
              Return to Store
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-3 pb-16 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white">
            Admin Control Center
          </h1>
          <p className="text-xs text-cyan-400">Signed in as {user.email}</p>
        </div>
        <Link
          to="/"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0f1221] px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-cyan-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to Store
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-neon-purple'
                  : 'border border-slate-800 bg-[#0f1221] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'balances' && <AdminBalanceRequests />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'keys' && <AdminKeys />}
        {activeTab === 'coupons' && <AdminCoupons />}
        {activeTab === 'banners' && <AdminBanners />}
        {activeTab === 'settings' && <AdminSettings />}
      </div>
    </main>
  );
}
