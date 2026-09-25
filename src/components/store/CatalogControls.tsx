"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { BOOK_SORTS, type BookSort, type Locale } from "@/lib/types";

const SORT_LABELS: Record<Locale, Record<BookSort, string>> = {
  ar: {
    featured: "المميّزة",
    newest: "الأحدث",
    "price-asc": "الأرخص أولاً",
    "price-desc": "الأغلى أولاً",
  },
  en: {
    featured: "Featured",
    newest: "Newest",
    "price-asc": "Price: low to high",
    "price-desc": "Price: high to low",
  },
};

/**
 * Sort + in-stock controls. The surrounding <form method="get"> works without
 * JavaScript; this only upgrades it to submit on change.
 */
export function CatalogControls({ lang, sort, inStockOnly }: { lang: Locale; sort: BookSort; inStockOnly: boolean }) {
  const d = getDictionary(lang);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative inline-flex items-center">
        <span className="sr-only">{d.books.sort}</span>
        <select
          value={sort}
          onChange={(e) => apply((n) => (e.target.value === "featured" ? n.delete("sort") : n.set("sort", e.target.value)))}
          className="h-9 appearance-none rounded-full border border-line-strong bg-surface pe-8 ps-3.5 text-sm font-semibold text-ink-soft"
        >
          {BOOK_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[lang][s]}
            </option>
          ))}
        </select>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute end-3 h-3 w-3 fill-none stroke-ink-soft stroke-2">
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </label>

      <button
        type="button"
        onClick={() => apply((n) => (inStockOnly ? n.delete("stock") : n.set("stock", "1")))}
        aria-pressed={inStockOnly}
        className={`btn btn-sm ${inStockOnly ? "btn-primary" : "btn-outline"}`}
      >
        {d.books.inStock}
      </button>
    </div>
  );
}
