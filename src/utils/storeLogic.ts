import type {
  Coupon,
  CurrencyCode,
  Product,
  ProductDuration,
  RecentPurchase,
  SiteSettings,
} from '../types/store';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'xif4t8@gmail.com';
export const MAX_RECENT_ORDERS = 20;

export function formatCurrency(
  amountBdt: number,
  currency: CurrencyCode = 'BDT',
  siteSettings: Partial<SiteSettings> = {}
): string {
  const num = Number(amountBdt) || 0;
  const usdtRate = Number(siteSettings.usdtRate) || 122;
  const inrRate = Number(siteSettings.inrRate) || 1.42;

  if (currency === 'USDT') {
    const val = num / usdtRate;
    return `$${val.toFixed(2)}`;
  }
  if (currency === 'INR') {
    const val = num / inrRate;
    return `₹${Math.round(val).toLocaleString()}`;
  }
  return `৳${Math.round(num).toLocaleString()}`;
}

export function convertFromBdt(
  amountBdt: number,
  currency: CurrencyCode = 'BDT',
  siteSettings: Partial<SiteSettings> = {}
): string {
  const num = Number(amountBdt) || 0;
  const usdtRate = Number(siteSettings.usdtRate) || 122;
  const inrRate = Number(siteSettings.inrRate) || 1.42;

  if (currency === 'USDT') return (num / usdtRate).toFixed(2);
  if (currency === 'INR') return Math.round(num / inrRate).toString();
  return Math.round(num).toString();
}

export function maskDisplayName(name = 'User'): string {
  const clean = String(name).trim();
  if (!clean) return 'U***';
  if (clean.length <= 2) return `${clean[0]}***`;
  return `${clean.slice(0, 3)}***${clean.slice(-1)}`;
}

export function calculateCouponDiscount(
  coupon: Pick<Coupon, 'type' | 'value'> | null,
  subtotalBdt: number
): number {
  if (!coupon || subtotalBdt <= 0) return 0;
  if (coupon.type === 'percent') {
    const pct = Math.max(0, Math.min(100, Number(coupon.value) || 0));
    return Math.round((subtotalBdt * pct) / 100);
  }
  return Math.min(subtotalBdt, Math.max(0, Number(coupon.value) || 0));
}

export function clampResellerDiscount(pct?: number | null): number {
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(80, Math.max(0, Math.round(n)));
}

export function getEffectiveUnitPrice(
  priceBdt: number,
  role?: string | null,
  resellerDiscountPct?: number | null
): number {
  const base = Math.max(0, Number(priceBdt) || 0);
  if (role !== 'reseller') return base;
  const pct = clampResellerDiscount(resellerDiscountPct);
  if (pct <= 0) return base;
  return Math.max(0, Math.round((base * (100 - pct)) / 100));
}

export function calculatePayableTotal(
  duration: Pick<ProductDuration, 'priceBdt'> | null,
  quantity: number,
  coupon: Pick<Coupon, 'type' | 'value'> | null,
  role?: string | null,
  resellerDiscountPct?: number | null
): {
  standardSubtotalBdt: number;
  resellerSavingsBdt: number;
  subtotalBdt: number;
  discountBdt: number;
  totalBdt: number;
} {
  const standardUnit = Math.max(0, Number(duration?.priceBdt) || 0);
  const effectiveUnit = getEffectiveUnitPrice(
    standardUnit,
    role,
    resellerDiscountPct
  );
  const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
  const standardSubtotalBdt = standardUnit * safeQty;
  const subtotalBdt = effectiveUnit * safeQty;
  const resellerSavingsBdt = Math.max(0, standardSubtotalBdt - subtotalBdt);
  const discountBdt = calculateCouponDiscount(coupon, subtotalBdt);
  const totalBdt = Math.max(0, subtotalBdt - discountBdt);
  return {
    standardSubtotalBdt,
    resellerSavingsBdt,
    subtotalBdt,
    discountBdt,
    totalBdt,
  };
}

export function getProductStartingPrice(
  product: Pick<Product, 'durations'>,
  role?: string | null,
  resellerDiscountPct?: number | null
): number {
  const durs = product.durations || [];
  if (durs.length === 0) return 0;
  const minBase = Math.min(...durs.map((d) => Number(d.priceBdt) || 0));
  return getEffectiveUnitPrice(minBase, role, resellerDiscountPct);
}

export function capRecentPurchases<T extends RecentPurchase>(items: T[]): T[] {
  return items.slice(0, MAX_RECENT_ORDERS);
}

export function checkIsAdmin(
  email?: string | null,
  role?: string | null,
  adminEmails: string[] = [],
  envAdminEmail?: string | null
): boolean {
  if (role === 'admin') return true;
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) return true;
  if (envAdminEmail && normalized === envAdminEmail.trim().toLowerCase()) return true;
  return adminEmails.some((e) => e.trim().toLowerCase() === normalized);
}

export function emailToDocId(email: string): string {
  const clean = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(clean);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 128);
}

export function computeExpiryIso(hours: number, fromMs: number = Date.now()): string {
  const safeHours = Math.max(1, Number(hours) || 24);
  return new Date(fromMs + safeHours * 3600 * 1000).toISOString();
}
