import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  Banner,
  CurrencyCode,
  Product,
  RecentPurchase,
  SiteSettings,
} from '../types/store';
import {
  DEFAULT_SITE_SETTINGS,
  SHOWCASE_BANNERS,
  SHOWCASE_PRODUCTS,
  SHOWCASE_RECENT_PURCHASES,
} from '../utils/seedData';
import { capRecentPurchases, MAX_RECENT_ORDERS } from '../utils/storeLogic';

interface StoreContextValue {
  siteSettings: SiteSettings;
  products: Product[];
  banners: Banner[];
  recentPurchases: RecentPurchase[];
  usingDemoCatalog: boolean;
  hasFirestoreBanners: boolean;
  currency: CurrencyCode;
  changeCurrency: (curr: CurrencyCode) => void;
  storeLoading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    DEFAULT_SITE_SETTINGS
  );
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreBanners, setFirestoreBanners] = useState<Banner[]>([]);
  const [firestoreRecent, setFirestoreRecent] = useState<RecentPurchase[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved =
      localStorage.getItem('sifat_currency') ||
      localStorage.getItem('tcb_currency');
    if (saved === 'BDT' || saved === 'USDT' || saved === 'INR') return saved;
    return 'BDT';
  });
  const [storeLoading, setStoreLoading] = useState(true);

  const changeCurrency = (curr: CurrencyCode) => {
    setCurrency(curr);
    localStorage.setItem('sifat_currency', curr);
  };

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'site'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<SiteSettings>;
          const normalizedName =
            !data.storeName || data.storeName === 'TCBROOT PANEL SHOP'
              ? DEFAULT_SITE_SETTINGS.storeName
              : data.storeName;
          setSiteSettings({
            ...DEFAULT_SITE_SETTINGS,
            ...data,
            storeName: normalizedName,
          });
        }
      },
      (err) => {
        console.warn('Settings snapshot warning:', err.message);
      }
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), orderBy('createdAt', 'desc')),
      (snap) => {
        setFirestoreProducts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
        );
        setStoreLoading(false);
      },
      (err) => {
        console.warn('Products snapshot warning:', err.message);
        setStoreLoading(false);
      }
    );

    const unsubBanners = onSnapshot(
      query(collection(db, 'banners'), orderBy('order', 'asc')),
      (snap) => {
        setFirestoreBanners(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Banner, 'id'>) }))
        );
      },
      (err) => {
        console.warn('Banners snapshot warning:', err.message);
      }
    );

    const unsubRecent = onSnapshot(
      query(
        collection(db, 'recentPurchases'),
        orderBy('createdAt', 'desc'),
        limit(MAX_RECENT_ORDERS)
      ),
      (snap) => {
        setFirestoreRecent(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<RecentPurchase, 'id'>),
          }))
        );
      },
      (err) => {
        console.warn('Recent purchases snapshot warning:', err.message);
      }
    );

    return () => {
      unsubSettings();
      unsubProducts();
      unsubBanners();
      unsubRecent();
    };
  }, []);

  const usingDemoCatalog = !storeLoading && firestoreProducts.length === 0;
  const hasFirestoreBanners = firestoreBanners.length > 0;
  const products =
    firestoreProducts.length > 0 ? firestoreProducts : SHOWCASE_PRODUCTS;
  const banners = hasFirestoreBanners ? firestoreBanners : SHOWCASE_BANNERS;
  const recentPurchases = capRecentPurchases(
    firestoreRecent.length > 0 ? firestoreRecent : SHOWCASE_RECENT_PURCHASES
  );

  return (
    <StoreContext.Provider
      value={{
        siteSettings,
        products,
        banners,
        recentPurchases,
        usingDemoCatalog,
        hasFirestoreBanners,
        currency,
        changeCurrency,
        storeLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
