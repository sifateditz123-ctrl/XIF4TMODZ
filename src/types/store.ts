export type CurrencyCode = 'BDT' | 'USDT' | 'INR';

export type PaymentMethodId = 'wallet' | 'bkash' | 'nagad' | 'rocket' | 'binance';

export type UserRole = 'user' | 'reseller' | 'admin';

export interface ProductDuration {
  id: string;
  label: string;
  hours: number;
  priceBdt: number;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  imageUrl: string;
  platformBadges: string[];
  apiConnected: boolean;
  setupVideoUrl: string;
  fileDownloadUrl: string;
  description: string;
  durations: ProductDuration[];
  active: boolean;
  createdAt?: unknown;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  order: number;
  active: boolean;
}

export interface SiteSettings {
  storeName: string;
  bkashNumber: string;
  bkashType: string;
  nagadNumber: string;
  nagadType: string;
  rocketNumber: string;
  rocketType: string;
  binanceId: string;
  usdtRate: number;
  inrRate: number;
  telegramUrl: string;
  whatsappUrl: string;
  showAppBanner: boolean;
  appDownloadUrl: string;
  appBannerTitle: string;
  appBannerSubtitle: string;
  adminEmails: string[];
}

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  resellerDiscountPct?: number;
  appliedInviteId?: string;
  walletBalance: number;
  totalSpent: number;
  totalKeys: number;
  createdAt?: unknown;
}

export interface RoleInviteRecord {
  id: string;
  email: string;
  role: 'admin' | 'reseller';
  resellerDiscountPct: number;
  addedByEmail?: string;
  createdAt?: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  maxUses: number;
  usageCount: number;
  active: boolean;
  createdAt?: unknown;
}

export interface RecentPurchase {
  id: string;
  displayNameMasked: string;
  productName: string;
  productImage?: string;
  durationLabel: string;
  quantity: number;
  amountBdt: number;
  paymentMethod: string;
  createdAt?: unknown;
}

export interface OrderRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  productName: string;
  productImage?: string;
  durationId: string;
  durationLabel: string;
  durationHours: number;
  quantity: number;
  unitPriceBdt: number;
  discountBdt: number;
  couponCode?: string;
  totalAmountBdt: number;
  paymentMethod: string;
  trxId: string;
  status: 'pending' | 'completed' | 'rejected';
  deliveredKeys: string[];
  expiresAt?: string | null;
  createdAt?: { toDate?: () => Date } | null;
}

export interface BalanceRequestRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  method: string;
  amountBdt: number;
  trxId: string;
  senderNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: { toDate?: () => Date } | null;
}

export interface TransactionLog {
  id: string;
  userId: string;
  type: string;
  title: string;
  amountBdt: number;
  method: string;
  status: string;
  createdAt?: { toDate?: () => Date } | null;
}

export interface LicenseKeyRecord {
  id: string;
  productId: string;
  productName: string;
  durationId: string;
  durationLabel: string;
  keyValue: string;
  status: 'available' | 'sold';
  soldToUid?: string;
  orderId?: string;
}

export interface CheckoutPayload {
  product: Product;
  duration: ProductDuration;
  quantity: number;
  coupon: Coupon | null;
  discountBdt: number;
  totalAmountBdt: number;
}
