import Link from "next/link";

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";

/**
 * The 404 body, shared by the two places a visitor can land on it:
 * `app/(store)/[lang]/not-found.tsx` renders it inside the store root layout, so
 * it inherits the header, footer, fonts and stylesheet; and
 * `app/global-not-found.tsx` renders it for URLs that match no route at all,
 * where Next skips every layout and so the page builds its own shell.
 *
 * Everything here is a Server Component with no data fetching, which keeps the
 * global variant cheap: the only request work is the locale coming back in.
 */
export function NotFoundScreen({ lang }: { lang: Locale }) {
  const d = getDictionary(lang);
  const n = d.notFound;
  const h = `/${lang}`;

  const quickLinks = [
    { href: `${h}/books`, label: d.nav.catalog },
    { href: `${h}/categories`, label: d.nav.categories },
    { href: `${h}/about`, label: d.nav.about },
    { href: `${h}/contact`, label: d.nav.contact },
  ];

  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-full bg-accent-soft/60 blur-3xl" />

      <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_auto] lg:py-20">
        <div className="max-w-xl">
          <span className="badge badge-accent latin">{n.code}</span>
          <h1 className="mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl">{n.title}</h1>
          <p className="prose-ar mt-4 text-ink-soft">{n.body}</p>

          <form
            method="get"
            action={`${h}/books`}
            role="search"
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <div className="relative min-w-56 flex-1">
              <label className="sr-only" htmlFor="not-found-search">
                {n.searchLabel}
              </label>
              <input
                id="not-found-search"
                type="search"
                name="q"
                placeholder={d.books.searchPlaceholder}
                className="field h-12 ps-11"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-2"
              >
                <circle cx="9" cy="9" r="5.5" />
                <path d="m13.5 13.5 3 3" strokeLinecap="round" />
              </svg>
            </div>
            <button type="submit" className="btn btn-primary h-12">
              {d.nav.search}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={h} className="btn btn-primary">
              {n.home}
            </Link>
            <Link href={`${h}/books`} className="btn btn-outline">
              {n.catalog}
            </Link>
          </div>
        </div>

        <div aria-hidden="true" className="relative mx-auto w-60 sm:w-72">
          <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-6 rounded-[14px] border border-line bg-sunken" />
          <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-3 rounded-[14px] border border-line bg-surface shadow-card" />
          <div className="card relative w-full overflow-hidden p-8">
            <div className="pointer-events-none absolute -end-12 -top-12 h-44 w-44 rounded-full bg-accent-soft/80 blur-3xl" />
            <div className="relative flex flex-col items-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
                <svg
                  viewBox="0 0 20 20"
                  className="h-7 w-7 fill-none stroke-current stroke-[1.75]"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 5.6C8.2 4.2 5.9 3.6 3 3.8v9.4c2.9-.2 5.2.4 7 1.7 1.8-1.3 4.1-1.9 7-1.7V3.8c-2.9-.2-5.2.4-7 1.8Z" />
                  <path d="M10 5.6v9.3" />
                </svg>
              </div>
              <div className="mt-6 w-full space-y-2.5">
                <div className="h-2.5 w-full rounded-full bg-sunken" />
                <div className="h-2.5 w-4/5 rounded-full bg-sunken" />
                <div className="h-2.5 w-2/3 rounded-full bg-sunken" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page py-8">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{n.quickLinks}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="card flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                {l.label}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 fill-none stroke-current stroke-2 rtl:rotate-180"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10h11m-4-4 4 4-4 4" />
                </svg>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            {n.help}{" "}
            <Link
              href={`${h}/contact`}
              className="font-semibold text-accent underline underline-offset-4 transition hover:text-accent-hover"
            >
              {d.contact.title}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default NotFoundScreen;
