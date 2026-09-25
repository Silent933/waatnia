"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { CURRENCY_EVENT, CURRENCY_LS_KEY } from "@/lib/constants";
import { isCurrency, type Currency, type Locale } from "@/lib/types";

type Rates = { usdPerSar: number; sypPerSar: number };

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (next: Currency) => void;
  rates: Rates;
  locale: Locale;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStored(): Currency | null {
  try {
    const value = window.localStorage.getItem(CURRENCY_LS_KEY);
    return isCurrency(value ?? "") ? (value as Currency) : null;
  } catch {
    return null;
  }
}

/**
 * localStorage is an external store, so `useSyncExternalStore` is the right
 * primitive: the server snapshot is `null` (→ the configured default) so the
 * first client render matches the static HTML exactly, and the stored
 * preference is picked up on the second render without a hydration mismatch
 * and without a setState-in-effect cascade.
 */
function subscribe(listener: () => void): () => void {
  // The native `storage` event covers other tabs; CURRENCY_EVENT covers this one.
  window.addEventListener("storage", listener);
  window.addEventListener(CURRENCY_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CURRENCY_EVENT, listener);
  };
}

export function CurrencyProvider({
  defaultCurrency,
  rates,
  locale,
  children,
}: {
  defaultCurrency: Currency;
  rates: Rates;
  locale: Locale;
  children: ReactNode;
}) {
  const currency = useSyncExternalStore(subscribe, readStored, () => null) ?? defaultCurrency;

  const setCurrency = useCallback((next: Currency) => {
    try {
      window.localStorage.setItem(CURRENCY_LS_KEY, next);
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new Event(CURRENCY_EVENT));
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency, rates, locale }),
    [currency, setCurrency, rates, locale],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
