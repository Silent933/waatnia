"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Price } from "@/components/store/Price";
import { placeOrder, type OrderFormState } from "@/app/actions/orders";
import { clearCart } from "@/lib/cart-store";
import { COUNTRIES } from "@/lib/countries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isFreeShipping } from "@/lib/shipping";
import { useCart } from "@/lib/use-cart";
import { PAYMENT_METHODS, type Locale, type Settings } from "@/lib/types";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

const initialState: OrderFormState = { status: "idle" };

export function CheckoutForm({ lang, settings }: { lang: Locale; settings: Settings }) {
  const d = getDictionary(lang);
  const router = useRouter();
  const { lines, subtotalCents } = useCart();
  const [state, formAction] = useActionState(placeOrder, initialState);

  const [country, setCountry] = useState("SY");
  const [city, setCity] = useState("");
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]>("cod");

  const free = useMemo(
    () => (city ? isFreeShipping(country, city, settings) : isFreeShipping(country, "", settings)),
    [country, city, settings],
  );
  const shippingCents = free ? 0 : settings.shippingFlatCents;

  const itemsJson = useMemo(
    () => JSON.stringify(lines.map((l) => ({ bookId: l.bookId, qty: l.qty }))),
    [lines],
  );

  useEffect(() => {
    if (state.status === "success" && state.orderNumber) {
      clearCart();
      router.push(`/${lang}/order/${state.orderNumber}`);
    }
  }, [state, lang, router]);

  if (lines.length === 0 && state.status !== "success") {
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

  const err = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <input type="hidden" name="locale" value={lang} />
      <input type="hidden" name="items" value={itemsJson} />

      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-6">
        <fieldset className="card p-5">
          <legend className="px-1 text-sm font-bold">{d.checkout.customer}</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">{d.checkout.name}</label>
              <input id="name" name="name" className="field" required autoComplete="name" />
              {err("name") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
            </div>
            <div>
              <label className="label" htmlFor="phone">{d.checkout.phone}</label>
              <input id="phone" name="phone" type="tel" className="field" required autoComplete="tel" dir="ltr" placeholder={d.checkout.phoneHint} />
              {err("phone") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
            </div>
            <div>
              <label className="label" htmlFor="country">{d.checkout.country}</label>
              <select
                id="country"
                name="country"
                className="field"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {lang === "ar" ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
              {err("country") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
            </div>
            <div>
              <label className="label" htmlFor="city">{d.checkout.city}</label>
              <input
                id="city"
                name="city"
                className="field"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              {err("city") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">{d.checkout.address}</label>
              <textarea id="address" name="address" rows={3} className="field" required placeholder={d.checkout.addressHint} />
              {err("address") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="note">
                {d.checkout.note} <span className="font-normal text-muted">({d.checkout.noteHint})</span>
              </label>
              <textarea id="note" name="note" rows={2} className="field" maxLength={1000} />
              {err("note") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
            </div>
          </div>
        </fieldset>

        <fieldset className="card p-5">
          <legend className="px-1 text-sm font-bold">{d.checkout.payment}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  payment === m ? "border-accent bg-accent-soft/50" : "border-line hover:bg-sunken"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m}
                  checked={payment === m}
                  onChange={() => setPayment(m)}
                  className="mt-0.5 accent-[#8a5a24]"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {m === "cod" ? d.checkout.paymentCod : d.checkout.paymentBank}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {m === "cod" ? d.checkout.paymentCodHint : d.checkout.paymentBankHint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {payment === "bank" && (settings.bankName || settings.bankIban || settings.bankAccountName) && (
            <div className="mt-4 rounded-xl border border-line bg-sunken p-4">
              <p className="text-sm font-semibold">{d.checkout.bankDetails}</p>
              <dl className="mt-2 space-y-1 text-sm">
                {settings.bankName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{lang === "ar" ? "البنك" : "Bank"}</dt>
                    <dd className="latin">{settings.bankName}</dd>
                  </div>
                )}
                {settings.bankAccountName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{lang === "ar" ? "صالح الحساب" : "Account name"}</dt>
                    <dd className="latin">{settings.bankAccountName}</dd>
                  </div>
                )}
                {settings.bankIban && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">IBAN</dt>
                    <dd className="latin">{settings.bankIban}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </fieldset>
      </div>

      <aside className="card sticky top-24 p-5">
        <h2 className="text-sm font-bold">{d.checkout.summary}</h2>

        <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
          {lines.map((l) => (
            <li key={l.bookId} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="latin block truncate font-semibold">{l.titleEn}</span>
                <span className="text-xs text-muted">× {l.qty}</span>
              </span>
              <Price cents={l.priceCents * l.qty} className="shrink-0 font-semibold" />
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{d.checkout.subtotal}</dt>
            <dd><Price cents={subtotalCents} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{d.checkout.shipping}</dt>
            <dd>
              {free ? (
                <span className="font-semibold text-ok">{d.checkout.shippingFree}</span>
              ) : (
                <Price cents={shippingCents} />
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-2 text-base">
            <dt className="font-bold">{d.checkout.total}</dt>
            <dd><Price cents={subtotalCents + shippingCents} className="text-xl font-bold text-accent" /></dd>
          </div>
        </dl>

        {state.status === "error" && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.message === "out_of_stock"
              ? lang === "ar"
                ? "أحد الكتب نفد من المخزون، يرجى تعديل السلة."
                : "A book in your cart just sold out. Please adjust the cart."
              : state.message === "empty"
                ? lang === "ar"
                  ? "السلة فارغة."
                  : "Your cart is empty."
                : state.message === "rate_limited"
                  ? lang === "ar"
                    ? `طلبات كثيرة خلال وقت قصير. حاول بعد ${Math.max(1, Math.ceil((state.retryAfter ?? 60_000) / 60_000))} دقيقة.`
                    : `Too many attempts. Please try again in ${Math.max(1, Math.ceil((state.retryAfter ?? 60_000) / 60_000))} minute(s).`
                  : d.common.error}
          </p>
        )}

        <div className="mt-4">
          <SubmitButton label={d.checkout.place} pendingLabel={d.checkout.placing} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{d.checkout.subtitle}</p>
      </aside>
    </form>
  );
}
