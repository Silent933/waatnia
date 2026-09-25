import { CURRENCY_SYMBOL, type Currency, type Locale, type Settings } from "@/lib/types";

/**
 * Everything is stored in SAR minor units ("cents"). USD and SYP are derived
 * from the configurable rates, and only rounded at the very end so order
 * totals never drift.
 */
export function convertFromSar(
  sarCents: number,
  currency: Currency,
  settings: Pick<Settings, "usdPerSar" | "sypPerSar">,
): number {
  const sar = sarCents / 100;
  switch (currency) {
    case "SAR":
      return round(sar, 2);
    case "SYP":
      return round(sar * settings.sypPerSar, 0);
    case "USD":
      return round(sar / (settings.usdPerSar || 1), 2);
  }
}

export function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

/** Latin digits in both locales: prices stay scannable and RTL-safe. */
function getFormatter(currency: Currency, locale: Locale): Intl.NumberFormat {
  const key = `${currency}:${locale}`;
  let f = formatterCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale === "ar" ? "ar-SY" : "en-US", {
        style: "currency",
        currency,
        numberingSystem: "latn",
        maximumFractionDigits: currency === "SYP" ? 0 : 2,
        minimumFractionDigits: currency === "SYP" ? 0 : 2,
      });
    } catch {
      // Unknown/unsupported currency code for this runtime — fall back manually.
      f = new Intl.NumberFormat(locale === "ar" ? "ar-SY" : "en-US", {
        numberingSystem: "latn",
        maximumFractionDigits: currency === "SYP" ? 0 : 2,
        minimumFractionDigits: currency === "SYP" ? 0 : 2,
      });
    }
    formatterCache.set(key, f);
  }
  return f;
}

/** Formats an already-converted amount. */
export function formatAmount(amount: number, currency: Currency, locale: Locale): string {
  return getFormatter(currency, locale).format(amount);
}

/** Converts then formats, in one step. */
export function formatSar(
  sarCents: number,
  currency: Currency,
  locale: Locale,
  settings: Pick<Settings, "usdPerSar" | "sypPerSar">,
): string {
  return formatAmount(convertFromSar(sarCents, currency, settings), currency, locale);
}

export function currencyName(currency: Currency, locale: Locale): string {
  const table = {
    ar: { USD: "دولار أمريكي", SAR: "ريال سعودي", SYP: "ليرة سورية" },
    en: { USD: "US Dollar", SAR: "Saudi Riyal", SYP: "Syrian Pound" },
  } satisfies Record<Locale, Record<Currency, string>>;
  return table[locale][currency];
}

export { CURRENCY_SYMBOL };
