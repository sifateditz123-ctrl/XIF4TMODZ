import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '../types/store';

export default function BannerSlider({ banners = [] }: { banners: Banner[] }) {
  const activeBanners = banners.filter((b) => b.active !== false);
  const [index, setIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [index, activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) {
    return (
      <section className="cyber-card cyber-glow-border relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Official License Store
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Instant Gaming Panel Keys
          </h1>
          <p className="mt-1.5 text-sm text-slate-300">
            Automated delivery, live stock tracking, and 24/7 bKash, Nagad, Rocket & Binance support.
          </p>
        </div>
      </section>
    );
  }

  const current = activeBanners[index % activeBanners.length];

  return (
    <section
      aria-label="Promotional announcements"
      className="cyber-glow-border relative h-36 overflow-hidden rounded-2xl bg-[#0f1221] shadow-neon-purple sm:h-64"
    >
      {!imgFailed && current.imageUrl ? (
        <img
          src={current.imageUrl}
          alt={current.title}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover opacity-70 transition-opacity duration-500"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-purple-950/80 via-[#0f1221] to-cyan-950/80" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-[#07080f] via-[#07080f]/80 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-center px-5 pb-8 pt-4 sm:px-10 sm:pb-10">
        {current.badge && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-fuchsia-300 sm:text-xs">
            {current.badge}
          </p>
        )}
        <h1 className="max-w-lg font-display text-lg font-extrabold tracking-wide text-white sm:text-3xl">
          {current.title}
        </h1>
        {current.subtitle && (
          <p className="mt-1 max-w-md line-clamp-2 text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
            {current.subtitle}
          </p>
        )}
      </div>

      {activeBanners.length > 1 && (
        <>
          <div className="absolute bottom-3 left-5 flex items-center gap-1.5 sm:left-10">
            {activeBanners.map((b, i) => (
              <button
                key={b.id || i}
                type="button"
                aria-label={`Show banner ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index % activeBanners.length
                    ? 'w-6 bg-cyan-400'
                    : 'w-2 bg-slate-500/70 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 sm:right-5">
            <button
              type="button"
              onClick={() =>
                setIndex(
                  (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                )
              }
              aria-label="Previous banner"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 bg-black/60 text-white/90 backdrop-blur transition hover:bg-purple-600/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev + 1) % activeBanners.length)}
              aria-label="Next banner"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 bg-black/60 text-white/90 backdrop-blur transition hover:bg-purple-600/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
