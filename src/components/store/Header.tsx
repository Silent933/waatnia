"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CartBadge } from "@/components/cart/CartBadge";
import { CurrencySwitcher } from "@/components/store/CurrencySwitcher";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type CategoryView, type Locale } from "@/lib/types";

function LocaleLink({ locale, pathname }: { locale: Locale; pathname: string }) {
  const segments = pathname.split("/");
  const rest = segments.slice(2).join("/");
  const href = `/${locale}${rest ? `/${rest}` : ""}`;
  const other: Locale = locale === "ar" ? "en" : "ar";
  const d = getDictionary(locale);

  return (
    <Link
      href={href}
      hrefLang={other}
      aria-label={d.otherLocaleName}
      className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:bg-sunken"
    >
      {other.toUpperCase()}
    </Link>
  );
}

export function Header({
  lang,
  storeName,
  tagline,
  categories,
}: {
  lang: Locale;
  storeName: string;
  tagline: string;
  categories: CategoryView[];
}) {
  const d = getDictionary(lang);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const h = `/${lang}`;

  const links = [
    { href: h, label: d.nav.home },
    { href: `${h}/books`, label: d.nav.catalog },
    { href: `${h}/categories`, label: d.nav.categories },
    { href: `${h}/about`, label: d.nav.about },
    { href: `${h}/contact`, label: d.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href={h} className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt={storeName}
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
          />
          <span className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="truncate text-base font-bold">{storeName}</span>
            <span className="truncate text-[11px] text-muted">{tagline}</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ms-2 hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = l.href === h ? pathname === h : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-sunken"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <form action={`${h}/books`} method="get" role="search" className="hidden md:block">
            <label className="relative block">
              <span className="sr-only">{d.nav.search}</span>
              <input
                type="search"
                name="q"
                placeholder={d.books.searchPlaceholder}
                className="h-9 w-40 rounded-full border border-line-strong bg-surface ps-9 pe-3 text-sm transition focus:w-56 focus:border-accent focus:outline-none lg:w-48"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-2"
              >
                <circle cx="9" cy="9" r="5.5" />
                <path d="m13.5 13.5 3 3" strokeLinecap="round" />
              </svg>
            </label>
          </form>

          <CurrencySwitcher locale={lang} />
          <LocaleLink locale={lang} pathname={pathname} />
          <CartBadge lang={lang} />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={d.nav.menu}
            className="btn btn-ghost btn-sm lg:hidden"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2">
              {open ? (
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            <form action={`${h}/books`} method="get" role="search" className="mb-2 md:hidden">
              <input
                type="search"
                name="q"
                placeholder={d.books.searchPlaceholder}
                className="field h-10"
              />
            </form>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-sunken"
              >
                {l.label}
              </Link>
            ))}
            {categories.length > 0 && (
              <>
                <p className="mt-2 px-3 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {d.nav.categories}
                </p>
                <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`${h}/books?category=${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="badge badge-muted"
                    >
                      {lang === "ar" ? c.nameAr : c.nameEn}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
