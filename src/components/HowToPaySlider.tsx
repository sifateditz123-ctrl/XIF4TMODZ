import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  Send,
  Smartphone,
} from 'lucide-react';

const METHOD_NAMES: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  binance: 'Binance Pay',
};

export default function HowToPaySlider({
  method = 'bkash',
  accountType = 'Personal',
}: {
  method: string;
  accountType?: string;
}) {
  const [step, setStep] = useState(0);
  const label = METHOD_NAMES[method] || 'Mobile Banking';

  const actionLabel =
    method === 'binance'
      ? 'Binance Pay -> Send'
      : accountType === 'Merchant'
      ? 'Make Payment'
      : 'Send Money';

  const slides = [
    {
      icon: Smartphone,
      title: `Step 1: Open ${label} App`,
      desc: `Launch your ${label} app and choose "${actionLabel}".`,
      color: 'text-fuchsia-400',
    },
    {
      icon: CopyCheck,
      title: 'Step 2: Copy ID & Exact Amount',
      desc: `Copy the ${label} ${accountType} number below and send the exact payable amount.`,
      color: 'text-cyan-400',
    },
    {
      icon: Send,
      title: 'Step 3: Paste TrxID to Verify',
      desc: 'Copy the Transaction ID (TrxID) from your confirmation message and submit it below.',
      color: 'text-emerald-400',
    },
  ];

  const current = slides[step];
  const Icon = current.icon;

  return (
    <div className="rounded-xl border border-purple-500/25 bg-[#090b14] p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
          How to Pay ({label})
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous payment step"
            onClick={() =>
              setStep((s) => (s - 1 + slides.length) % slides.length)
            }
            className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-300 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next payment step"
            onClick={() => setStep((s) => (s + 1) % slides.length)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-300 hover:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80">
          <Icon className={`h-5 w-5 ${current.color}`} aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">{current.title}</h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            {current.desc}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex justify-center gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Step ${idx + 1}`}
            onClick={() => setStep(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === step ? 'w-5 bg-cyan-400' : 'w-1.5 bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
