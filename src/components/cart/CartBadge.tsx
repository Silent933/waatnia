"use client";

import Link from "next/link";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { useCart } from "@/lib/use-cart";
import type { Locale } from "@/lib/types";

export function CartBadge({ lang }: { lang: Locale }) {
  const { count } = useCart();
  const d = getDictionary(lang);

  return (
    <Link
      href={`/${lang}/cart`}
      aria-label={`${d.nav.cart}${count ? ` (${count})` : ""}`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-soft transition hover:bg-sunken"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[18px] w-[18px] fill-none stroke-current stroke-[1.7]">
        <path d="M2.5 3h1.8l1.6 8.4a1.4 1.4 0 0 0 1.4 1.1h6.9a1.4 1.4 0 0 0 1.4-1.1L17 6H5.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="16.5" r="1.1" />
        <circle cx="14.5" cy="16.5" r="1.1" />
      </svg>
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
