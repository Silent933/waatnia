"use client";

import { useCurrency } from "@/components/store/CurrencyProvider";
import { convertFromSar, formatAmount } from "@/lib/money";

/**
 * Formats a SAR amount in the visitor's chosen currency. Rendered on the server
 * in the shop default currency, then re-rendered on the client once the saved
 * preference is known.
 */
export function Price({
  cents,
  className,
  symbolFirst = false,
}: {
  cents: number;
  className?: string;
  symbolFirst?: boolean;
}) {
  const { currency, locale, rates } = useCurrency();
  const value = convertFromSar(cents, currency, rates);
  const text = symbolFirst
    ? `${formatAmount(value, currency, locale)}`
    : formatAmount(value, currency, locale);

  return <span className={className}>{text}</span>;
}
