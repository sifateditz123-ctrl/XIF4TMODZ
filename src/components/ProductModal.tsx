import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Minus,
  PlayCircle,
  Plus,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { validateCouponCode } from '../services/orderService';
import type { CheckoutPayload, Coupon, Product } from '../types/store';
import {
  calculatePayableTotal,
  formatCurrency,
} from '../utils/storeLogic';

export default function ProductModal({
  product,
  onClose,
  onOpenVideo,
  onProceedToPayment,
}: {
  product: Product;
  onClose: () => void;
  onOpenVideo: (url: string, title: string) => void;
  onProceedToPayment: (payload: CheckoutPayload) => void;
}) {
  const { currency, siteSettings, usingDemoCatalog } = useStore();
  const { user, userProfile, openAuthModal } = useAuth();

  const durations = product.durations || [];
  const [selectedDurId, setSelectedDurId] = useState(durations[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const selectedDuration = useMemo(() => {
    return (
      durations.find((d) => d.id === selectedDurId) || durations[0] || null
    );
  }, [durations, selectedDurId]);

  const {
    standardSubtotalBdt,
    resellerSavingsBdt,
    subtotalBdt,
    discountBdt,
    totalBdt,
  } = useMemo(
    () =>
      calculatePayableTotal(
        selectedDuration,
        quantity,
        appliedCoupon,
        userProfile?.role,
        userProfile?.resellerDiscountPct
      ),
    [selectedDuration, quantity, appliedCoupon, userProfile?.role, userProfile?.resellerDiscountPct]
  );

  const handleApplyCoupon = async () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    setCheckingCoupon(true);
    try {
      const { coupon } = await validateCouponCode(clean, subtotalBdt);
      setAppliedCoupon(coupon);
      toast.success(`Coupon ${coupon.code} applied!`);
    } catch (err) {
      if (usingDemoCatalog && clean === 'SIFAT10') {
        const demoCoupon: Coupon = {
          id: 'demo-sifat10',
          code: 'SIFAT10',
          type: 'percent',
          value: 10,
          maxUses: 0,
          usageCount: 0,
          active: true,
        };
        setAppliedCoupon(demoCoupon);
        toast.success('Coupon SIFAT10 (10% OFF) applied!');
      } else {
        setAppliedCoupon(null);
        toast.error(err instanceof Error ? err.message : 'Invalid coupon');
      }
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(20, prev + delta)));
  };

  const handleProceed = () => {
    if (!selectedDuration || !selectedDuration.inStock) {
      toast.error('Selected duration is currently out of stock.');
      return;
    }

    const checkoutPayload: CheckoutPayload = {
      product,
      duration: selectedDuration,
      quantity,
      coupon: appliedCoupon,
      discountBdt,
      totalAmountBdt: totalBdt,
    };

    if (!user) {
      toast('Please sign in to proceed to payment');
      openAuthModal(() => onProceedToPayment(checkoutPayload));
      return;
    }

    onProceedToPayment(checkoutPayload);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
    >
      <div className="cyber-card cyber-glow-border max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-xl border border-purple-500/30 object-cover"
            />
            <div>
              <h2
                id="product-modal-title"
                className="font-display text-lg font-bold text-white"
              >
                {product.name}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-400">
                {(product.platformBadges || []).join(' · ')}
                {product.apiConnected ? ' · API Connected' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {product.description && (
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {product.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() =>
              product.setupVideoUrl
                ? onOpenVideo(product.setupVideoUrl, product.name)
                : toast.error('Setup video not uploaded yet')
            }
            className="flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 py-2 text-xs font-bold text-fuchsia-300 transition hover:bg-fuchsia-500/20"
          >
            <PlayCircle className="h-4 w-4" />
            Setup Video
          </button>

          <a
            href={product.fileDownloadUrl || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!product.fileDownloadUrl) {
                e.preventDefault();
                toast.error('Download link not configured');
              }
            }}
            className="flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            <Download className="h-4 w-4" />
            File Download
          </a>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="duration-select"
              className="text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Select Validity / Duration
            </label>
            {selectedDuration && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                  selectedDuration.inStock
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {selectedDuration.inStock ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> Out of Stock
                  </>
                )}
              </span>
            )}
          </div>

          <select
            id="duration-select"
            value={selectedDuration?.id || ''}
            onChange={(e) => {
              setSelectedDurId(e.target.value);
              setAppliedCoupon(null);
            }}
            className="w-full rounded-xl border border-slate-700 bg-[#090b14] px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-cyan-400"
          >
            {durations.map((dur) => (
              <option key={dur.id} value={dur.id}>
                {dur.label} — {formatCurrency(dur.priceBdt, currency, siteSettings)}{' '}
                {dur.inStock ? '(In Stock)' : '(Out of Stock)'}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-[#090b14] px-3.5 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Quantity
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => handleQuantityChange(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-purple-600"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span
              data-testid="modal-quantity"
              className="w-7 text-center font-mono text-sm font-bold tabular-nums text-white"
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => handleQuantityChange(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-purple-600"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="coupon-input"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            Coupon Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                id="coupon-input"
                type="text"
                placeholder="Enter promo code (e.g. SIFAT10)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-[#090b14] py-2.5 pl-9 pr-3 text-sm font-bold uppercase text-white outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={checkingCoupon}
              className="flex min-h-[42px] items-center gap-1 rounded-xl border border-purple-500/40 bg-purple-600/20 px-4 text-xs font-bold text-purple-200 transition hover:bg-purple-600/40"
            >
              {checkingCoupon && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply
            </button>
          </div>
          {appliedCoupon && (
            <p className="mt-1.5 text-xs font-semibold text-emerald-400">
              Promo "{appliedCoupon.code}" applied (-
              {formatCurrency(discountBdt, currency, siteSettings)})
            </p>
          )}
        </div>

        <div className="mt-4 space-y-1.5 rounded-xl border border-slate-800 bg-[#090b14]/90 p-3.5 text-xs tabular-nums">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>
              {formatCurrency(standardSubtotalBdt, currency, siteSettings)}
            </span>
          </div>
          {resellerSavingsBdt > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>
                Reseller Discount ({userProfile?.resellerDiscountPct || 0}% OFF)
              </span>
              <span>
                -{formatCurrency(resellerSavingsBdt, currency, siteSettings)}
              </span>
            </div>
          )}
          {discountBdt > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Promo Discount</span>
              <span>-{formatCurrency(discountBdt, currency, siteSettings)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-extrabold text-white">
            <span>Payable Total</span>
            <span data-testid="modal-total" className="font-mono text-cyan-400">
              {formatCurrency(totalBdt, currency, siteSettings)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          disabled={!selectedDuration?.inStock}
          className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 py-3 text-sm font-extrabold text-white shadow-neon-purple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="h-4 w-4" />
          {selectedDuration?.inStock
            ? 'Proceed to Payment'
            : 'Currently Out of Stock'}
        </button>
      </div>
    </div>
  );
}
