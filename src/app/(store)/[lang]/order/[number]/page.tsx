import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Price } from "@/components/store/Price";
import { getOrderForGuest } from "@/app/actions/orders";
import { StatusBadge } from "@/components/store/StatusBadge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { hasDatabase } from "@/lib/prisma";
import { isLocale, type OrderStatus } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/order/[number]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).checkout.orderNumber, robots: { index: false, follow: false } };
}

export default async function OrderPage({ params }: PageProps<"/[lang]/order/[number]">) {
  const { lang, number } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);

  if (!hasDatabase()) {
    return (
      <div className="container-page py-10">
        <div className="card p-10 text-center">
          <p className="text-lg font-semibold">{d.common.error}</p>
        </div>
      </div>
    );
  }

  const order = await getOrderForGuest(number);

  if (!order) {
    return (
      <div className="container-page py-10">
        <div className="card mx-auto max-w-md p-10 text-center">
          <p className="text-lg font-semibold">{d.checkout.notFound}</p>
          <Link href={`/${lang}/order`} className="btn btn-outline mt-6">
            {d.checkout.track}
          </Link>
        </div>
      </div>
    );
  }

  const steps: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];
  const currentIndex = steps.indexOf(order.status as OrderStatus);

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="card p-6 text-center sm:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok-soft text-ok">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-2.5">
            <path d="m4 10.5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl">{d.checkout.success}</h1>
        <p className="mt-2 text-ink-soft">{d.checkout.successHint}</p>
        <p className="mt-5 inline-block rounded-xl bg-sunken px-5 py-3">
          <span className="block text-xs text-muted">{d.checkout.orderNumber}</span>
          <span className="latin mt-0.5 block text-lg font-bold tracking-wide">{order.number}</span>
        </p>
      </div>

      {order.status !== "cancelled" && (
        <ol className="mt-8 flex items-center">
          {steps.map((s, i) => {
            const done = currentIndex >= i;
            return (
              <li key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${
                      done ? "border-accent bg-accent text-white" : "border-line-strong bg-surface text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`whitespace-nowrap text-[11px] font-semibold ${done ? "text-ink" : "text-muted"}`}>
                    {d.status[s]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <span className={`mx-2 h-0.5 flex-1 ${i < currentIndex ? "bg-accent" : "bg-line"}`} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">{d.checkout.summary}</h2>
          <StatusBadge status={order.status as OrderStatus} lang={lang} />
        </div>

        <ul className="mt-4 divide-y divide-line">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-4 py-3">
              <div className="relative h-16 shrink-0 overflow-hidden rounded-lg bg-sunken" style={{ width: "3rem" }}>
                <Image src={item.cover} alt={item.titleEn} fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="latin truncate text-sm font-semibold">{item.titleEn}</p>
                {item.titleAr && <p className="truncate text-xs text-muted">{item.titleAr}</p>}
              </div>
              <span className="text-sm text-muted">× {item.quantity}</span>
              <Price cents={item.unitPriceCents * item.quantity} className="text-sm font-bold" />
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{d.checkout.subtotal}</dt>
            <dd><Price cents={order.subtotalCents} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{d.checkout.shipping}</dt>
            <dd>
              {order.shippingCents === 0 ? (
                <span className="font-semibold text-ok">{d.checkout.shippingFree}</span>
              ) : (
                <Price cents={order.shippingCents} />
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-2 text-base">
            <dt className="font-bold">{d.checkout.total}</dt>
            <dd><Price cents={order.totalCents} className="text-xl font-bold text-accent" /></dd>
          </div>
        </dl>
      </div>

      <div className="card mt-6 p-6 text-sm">
        <h2 className="text-base font-bold">{d.checkout.customer}</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-muted">{d.checkout.name}</dt><dd className="font-semibold">{order.customerName}</dd></div>
          <div><dt className="text-muted">{d.checkout.city}</dt><dd className="font-semibold">{order.city} — {order.countryAr}</dd></div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/${lang}/books`} className="btn btn-outline">
          {d.cart.continue}
        </Link>
        <Link href={`/${lang}/order`} className="btn btn-ghost">
          {d.checkout.track}
        </Link>
      </div>
    </div>
  );
}
