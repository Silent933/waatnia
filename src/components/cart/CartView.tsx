"use client";

import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/store/Price";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { clearCart, removeLine, setQty } from "@/lib/cart-store";
import { useCart } from "@/lib/use-cart";
import type { Locale } from "@/lib/types";

export function CartView({ lang }: { lang: Locale }) {
  const d = getDictionary(lang);
  const { lines, count, subtotalCents } = useCart();

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-12 text-center">
        <p className="text-lg font-semibold">{d.cart.empty}</p>
        <p className="mt-1.5 text-sm text-muted">{d.cart.emptyHint}</p>
        <Link href={`/${lang}/books`} className="btn btn-primary mt-6">
          {d.cart.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="card divide-y divide-line">
        {lines.map((line) => (
          <div key={line.bookId} className="flex gap-4 p-4">
            <Link
              href={`/${lang}/books/${line.slug}`}
              className="relative h-24 w-18 shrink-0 overflow-hidden rounded-lg bg-sunken"
              style={{ width: "4.5rem" }}
            >
              <Image src={line.cover} alt={line.titleEn} fill sizes="72px" className="object-cover" />
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/${lang}/books/${line.slug}`} className="latin block truncate font-bold hover:text-accent">
                {line.titleEn}
              </Link>
              {line.titleAr && <p className="truncate text-sm text-muted">{line.titleAr}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-line-strong">
                  <button
                    type="button"
                    onClick={() => setQty(line.bookId, line.qty - 1)}
                    aria-label="-"
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition hover:bg-sunken"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(line.bookId, line.qty + 1)}
                    disabled={line.qty >= line.stock}
                    aria-label="+"
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition hover:bg-sunken disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.bookId)}
                  className="text-xs font-semibold text-danger underline underline-offset-4"
                >
                  {d.cart.remove}
                </button>
              </div>
            </div>

            <div className="shrink-0 text-end">
              <Price cents={line.priceCents * line.qty} className="text-sm font-bold text-accent" />
            </div>
          </div>
        ))}
      </div>

      <aside className="card sticky top-24 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {d.cart.itemCount.replace("{n}", String(count))}
          </p>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-semibold text-muted underline underline-offset-4 transition hover:text-danger"
          >
            {d.cart.clear}
          </button>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="font-semibold">{d.cart.total}</span>
          <Price cents={subtotalCents} className="text-2xl font-bold text-accent" />
        </div>
        <p className="mt-1.5 text-xs text-muted">{d.checkout.shipping}</p>

        <Link href={`/${lang}/checkout`} className="btn btn-primary mt-5 w-full">
          {d.cart.checkout}
        </Link>
        <Link href={`/${lang}/books`} className="btn btn-ghost mt-2 w-full">
          {d.cart.continue}
        </Link>
      </aside>
    </div>
  );
}
