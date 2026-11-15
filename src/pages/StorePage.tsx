import React, { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import BannerSlider from '../components/BannerSlider';
import PaymentModal from '../components/PaymentModal';
import ProductModal from '../components/ProductModal';
import VideoModal from '../components/VideoModal';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import type { CheckoutPayload, Product } from '../types/store';
import {
  formatCurrency,
  getProductStartingPrice,
  MAX_RECENT_ORDERS,
} from '../utils/storeLogic';

export default function StorePage() {
  const { userProfile } = useAuth();
  const {
    products,
    banners,
    recentPurchases,
    currency,
    siteSettings,
    storeLoading,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutPayload | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ url: string; title: string } | null>(
    null
  );
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  const categories = useMemo(() => {
    const cats = new Set(['ALL']);
    activeProducts.forEach((p) => {
      if (p.category) cats.add(p.category.toUpperCase());
    });
    return Array.from(cats);
  }, [activeProducts]);

  const brands = useMemo(() => {
    const b = new Set(['ALL']);
    activeProducts.forEach((p) => {
      if (p.brand) b.add(p.brand.toUpperCase());
    });
    return Array.from(b);
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      const catMatch =
        selectedCategory === 'ALL' ||
        (p.category || '').toUpperCase() === selectedCategory;
      const brandMatch =
        selectedBrand === 'ALL' ||
        (p.brand || '').toUpperCase() === selectedBrand;
      return catMatch && brandMatch;
    });
  }, [activeProducts, selectedCategory, selectedBrand]);

  const visibleRecent = useMemo(
    () => recentPurchases.slice(0, MAX_RECENT_ORDERS),
    [recentPurchases]
  );

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-3 pb-24 pt-3 sm:space-y-6 sm:px-6 sm:pt-4">
      {/* Promotional Banner Slider */}
      <BannerSlider banners={banners} />

      {/* Category & Brand Filter Controls */}
      <section aria-label="Catalog filters" className="space-y-2">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`min-h-[36px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-extrabold tracking-wider whitespace-nowrap transition-all sm:min-h-[40px] sm:px-4 sm:py-2 ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-neon-purple'
                  : 'border border-slate-800 bg-[#0f1221] text-slate-400 hover:border-purple-500/40 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {brands.length > 1 && (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {brands.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                aria-pressed={selectedBrand === brand}
                className={`min-h-[34px] shrink-0 rounded-lg border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition ${
                  selectedBrand === brand
                    ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200'
                    : 'border-slate-800 bg-[#0b0d18] text-slate-400 hover:text-slate-200'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Product Grid (2 columns on mobile, 3 columns on desktop) */}
      <section aria-label="Available license panels">
        {storeLoading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-[#0f1221] sm:h-72"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="cyber-card rounded-2xl p-10 text-center">
            <p className="font-display text-sm font-bold text-slate-300">
              No products found in this category.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try selecting "ALL" or add products from the /admin panel.
            </p>
          </div>
        ) : (
          <div
            data-testid="product-grid"
            className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3"
          >
            {filteredProducts.map((product) => {
              const standardPrice = getProductStartingPrice(product);
              const startPrice = getProductStartingPrice(
                product,
                userProfile?.role,
                userProfile?.resellerDiscountPct
              );
              const hasResellerPrice = startPrice < standardPrice;
              const hasStock = (product.durations || []).some((d) => d.inStock);
              const isImgBroken = failedImages[product.id] || !product.imageUrl;

              return (
                <article
                  key={product.id}
                  className="cyber-card group flex min-w-0 flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#090b14]">
                    {!isImgBroken ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [product.id]: true,
                          }))
                        }
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-950 via-[#0f1221] to-cyan-950 p-3 text-center">
                        <span className="font-display text-xs font-bold text-slate-300 sm:text-sm">
                          {product.name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1b] via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-4">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold tracking-wide text-cyan-400 sm:text-[11px]">
                        {product.category || 'PANEL'}
                        <span aria-hidden="true"> · </span>
                        <span
                          className={
                            hasStock ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {hasStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </p>

                      <h2 className="mt-0.5 truncate font-display text-xs font-bold text-white sm:mt-1 sm:text-base">
                        {product.name}
                      </h2>

                      <p className="mt-0.5 truncate text-[10px] text-slate-400 sm:mt-1 sm:text-xs">
                        {(product.platformBadges || []).join(' · ')}
                        {product.apiConnected ? ' · API Connected' : ''}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-slate-800/80 pt-2 sm:mt-4 sm:gap-3 sm:pt-3">
                      <div className="min-w-0">
                        <span className="block truncate text-[9px] font-semibold uppercase text-slate-400 sm:text-[10px]">
                          <span className="hidden sm:inline">
                            {hasResellerPrice ? 'Reseller ' : 'Starting '}
                          </span>
                          From
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="block truncate font-mono text-xs font-extrabold tabular-nums text-cyan-300 sm:text-base">
                            {formatCurrency(startPrice, currency, siteSettings)}
                          </span>
                          {hasResellerPrice && (
                            <span className="hidden truncate font-mono text-[10px] text-slate-500 line-through sm:inline">
                              {formatCurrency(
                                standardPrice,
                                currency,
                                siteSettings
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveProduct(product)}
                        aria-label={`Buy ${product.name}`}
                        className="flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-neon-purple whitespace-nowrap transition hover:brightness-110 sm:min-h-[42px] sm:gap-1.5 sm:rounded-xl sm:px-4 sm:py-2 sm:text-xs"
                      >
                        <ShoppingCart
                          className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                          aria-hidden="true"
                        />
                        BUY
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Live Recent Orders Feed (Strictly Capped at 20 Orders) */}
      <section
        aria-label="Recent orders"
        className="cyber-card rounded-2xl p-4 sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold text-white sm:text-base">
              Live Recent Orders
            </h2>
          </div>
          <span className="font-mono text-xs font-bold tabular-nums text-emerald-400">
            Showing {visibleRecent.length} / {MAX_RECENT_ORDERS}
          </span>
        </div>

        {visibleRecent.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            No recent purchases yet.
          </p>
        ) : (
          <div
            data-testid="recent-orders-list"
            className="grid gap-2.5 sm:grid-cols-2"
          >
            {visibleRecent.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#090b14]/90 px-3.5 py-2.5 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600/20 text-purple-300">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      <span className="text-cyan-400">
                        {item.displayNameMasked}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.durationLabel}</span>
                      {item.quantity > 1 && <span> x{item.quantity}</span>}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="block font-mono text-xs font-bold tabular-nums text-emerald-400">
                    {formatCurrency(item.amountBdt, currency, siteSettings)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase text-slate-500">
                    <Clock className="h-2.5 w-2.5" aria-hidden="true" />{' '}
                    {item.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {activeProduct && (
        <ProductModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onOpenVideo={(url, title) => setVideoInfo({ url, title })}
          onProceedToPayment={(payload) => {
            setActiveProduct(null);
            setCheckoutData(payload);
          }}
        />
      )}

      {checkoutData && (
        <PaymentModal
          checkoutData={checkoutData}
          onClose={() => setCheckoutData(null)}
        />
      )}

      {videoInfo && (
        <VideoModal
          url={videoInfo.url}
          title={videoInfo.title}
          onClose={() => setVideoInfo(null)}
        />
      )}
    </main>
  );
}
