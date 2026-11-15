import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type { Banner, Product, ProductDuration, RecentPurchase, SiteSettings } from '../types/store';

import bannerCyberImg from '../assets/images/banner_cyber_panel_1794761671236.jpg';
import bannerWalletImg from '../assets/images/banner_instant_wallet_1794761671398.jpg';
import prodTcbrootImg from '../assets/images/product_tcbroot_pro_1794761671868.jpg';
import prodShadowImg from '../assets/images/product_shadow_vip_1794761672963.jpg';
import prodFluoriteImg from '../assets/images/product_fluorite_ios_1794761673683.jpg';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: 'SIFAT MODZ',
  bkashNumber: '01712345678',
  bkashType: 'Personal',
  nagadNumber: '01812345678',
  nagadType: 'Personal',
  rocketNumber: '01912345678',
  rocketType: 'Personal',
  binanceId: '492817304',
  usdtRate: 122,
  inrRate: 1.42,
  telegramUrl: 'https://t.me/sifatmodz',
  whatsappUrl: 'https://whatsapp.com/channel/',
  showAppBanner: true,
  appDownloadUrl: 'https://sifatmodz.shop/app.apk',
  appBannerTitle: 'Download Official SIFAT MODZ App',
  appBannerSubtitle: 'Instant key alerts, faster checkout & one-tap panel access.',
  adminEmails: ['xif4t8@gmail.com'],
};

export const DEFAULT_DURATIONS: ProductDuration[] = [
  { id: '1h', label: '1 Hour', hours: 1, priceBdt: 30, inStock: true },
  { id: '3h', label: '3 Hours', hours: 3, priceBdt: 60, inStock: true },
  { id: '12h', label: '12 Hours', hours: 12, priceBdt: 110, inStock: true },
  { id: '1d', label: '1 Day', hours: 24, priceBdt: 160, inStock: true },
  { id: '3d', label: '3 Days', hours: 72, priceBdt: 350, inStock: true },
  { id: '7d', label: '7 Days', hours: 168, priceBdt: 650, inStock: true },
  { id: '28d', label: '28 Days', hours: 672, priceBdt: 1500, inStock: true },
];

export const SHOWCASE_BANNERS: Banner[] = [
  {
    id: 'showcase-banner-1',
    title: 'SIFAT MODZ Cyber Panel Suite',
    subtitle: 'Instant API-connected key delivery with 24/7 automated wallet checkout.',
    badge: 'Featured Release',
    imageUrl: bannerCyberImg,
    order: 1,
    active: true,
  },
  {
    id: 'showcase-banner-2',
    title: 'Zero-Fee Wallet Top-Up',
    subtitle: 'Deposit instantly via bKash, Nagad, Rocket & Binance Pay USDT.',
    badge: 'Fast Gateway',
    imageUrl: bannerWalletImg,
    order: 2,
    active: true,
  },
];

export const SHOWCASE_PRODUCTS: Product[] = [
  {
    id: 'showcase-sifat-pro',
    name: 'SIFAT MODZ PRO PANEL',
    category: 'ROOT',
    brand: 'SIFAT',
    imageUrl: prodTcbrootImg,
    platformBadges: ['Android'],
    apiConnected: true,
    setupVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileDownloadUrl: 'https://sifatmodz.shop/downloads/sifat-modz-pro.apk',
    description: 'Kernel-level root panel with instant API license verification and smooth overlay controls.',
    durations: DEFAULT_DURATIONS,
    active: true,
  },
  {
    id: 'showcase-shadow-vip',
    name: 'SHADOW NON-ROOT VIP',
    category: 'NONROOT',
    brand: 'SHADOW',
    imageUrl: prodShadowImg,
    platformBadges: ['Android', 'iOS'],
    apiConnected: true,
    setupVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileDownloadUrl: 'https://sifatmodz.shop/downloads/shadow-vip.apk',
    description: 'No root required. Lightweight ESP & tactical overlay compatible with Android and iOS.',
    durations: DEFAULT_DURATIONS.map((d) => ({ ...d, priceBdt: d.priceBdt + 40 })),
    active: true,
  },
  {
    id: 'showcase-fluorite-ios',
    name: 'FLUORITE iOS PANEL',
    category: 'IOS',
    brand: 'FLUORITE',
    imageUrl: prodFluoriteImg,
    platformBadges: ['iOS'],
    apiConnected: true,
    setupVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileDownloadUrl: 'https://sifatmodz.shop/downloads/fluorite.ipa',
    description: 'Zero-jailbreak iOS IPA loader with UDID cloud key binding and fast updates.',
    durations: DEFAULT_DURATIONS.map((d) => ({ ...d, priceBdt: d.priceBdt + 100 })),
    active: true,
  },
];

export const SHOWCASE_RECENT_PURCHASES: RecentPurchase[] = [
  {
    id: 'recent-demo-1',
    displayNameMasked: 'Rif***t',
    productName: 'SIFAT MODZ PRO PANEL',
    durationLabel: '7 Days',
    quantity: 1,
    amountBdt: 650,
    paymentMethod: 'wallet',
  },
  {
    id: 'recent-demo-2',
    displayNameMasked: 'Tan***r',
    productName: 'SHADOW NON-ROOT VIP',
    durationLabel: '1 Day',
    quantity: 2,
    amountBdt: 400,
    paymentMethod: 'bkash',
  },
  {
    id: 'recent-demo-3',
    displayNameMasked: 'Mah***n',
    productName: 'FLUORITE iOS PANEL',
    durationLabel: '28 Days',
    quantity: 1,
    amountBdt: 1600,
    paymentMethod: 'binance',
  },
  {
    id: 'recent-demo-4',
    displayNameMasked: 'Saj***l',
    productName: 'SIFAT MODZ PRO PANEL',
    durationLabel: '3 Hours',
    quantity: 1,
    amountBdt: 60,
    paymentMethod: 'nagad',
  },
];

export async function seedSampleStoreData(): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'site'), DEFAULT_SITE_SETTINGS, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/site');
  }

  for (const b of SHOWCASE_BANNERS) {
    try {
      await addDoc(collection(db, 'banners'), {
        title: b.title,
        subtitle: b.subtitle,
        badge: b.badge,
        imageUrl: b.imageUrl,
        order: b.order,
        active: b.active,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'banners');
    }
  }

  for (const prod of SHOWCASE_PRODUCTS) {
    try {
      const pRef = await addDoc(collection(db, 'products'), {
        name: prod.name,
        category: prod.category,
        brand: prod.brand,
        imageUrl: prod.imageUrl,
        platformBadges: prod.platformBadges,
        apiConnected: prod.apiConnected,
        setupVideoUrl: prod.setupVideoUrl,
        fileDownloadUrl: prod.fileDownloadUrl,
        description: prod.description,
        durations: prod.durations,
        active: prod.active,
        createdAt: serverTimestamp(),
      });

      for (const dur of prod.durations) {
        for (let i = 1; i <= 2; i++) {
          await addDoc(collection(db, 'licenseKeys'), {
            productId: pRef.id,
            productName: prod.name,
            durationId: dur.id,
            durationLabel: dur.label,
            keyValue: `SIFAT-${dur.id.toUpperCase()}-${Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase()}-${i}`,
            status: 'available',
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  }

  try {
    await addDoc(collection(db, 'coupons'), {
      code: 'SIFAT10',
      type: 'percent',
      value: 10,
      maxUses: 0,
      usageCount: 0,
      active: true,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'coupons');
  }
}
