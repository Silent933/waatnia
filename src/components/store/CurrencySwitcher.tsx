"use client";

import { useCurrency } from "@/components/store/CurrencyProvider";
import { currencyName } from "@/lib/money";
import { CURRENCIES, type Currency, type Locale } from "@/lib/types";

export function CurrencySwitcher({ locale }: { locale: Locale }) {
  const { currency, setCurrency } = useCurrency();
  const current = currency;

  function pick(next: Currency) {
    if (next === current) return;
    setCurrency(next);
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{currencyName(current, locale)}</span>
      <select
        value={current}
        onChange={(e) => pick(e.target.value as Currency)}
        aria-label="Currency"
        className="appearance-none rounded-full border border-line-strong bg-transparent py-1.5 pe-6 ps-2.5 text-xs font-semibold text-ink-soft transition hover:bg-sunken"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute end-2 h-3 w-3 fill-none stroke-ink-soft stroke-2"
      >
        <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
