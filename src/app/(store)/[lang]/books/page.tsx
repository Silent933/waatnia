import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/store/BookCard";
import { CatalogControls } from "@/components/store/CatalogControls";
import { Pagination } from "@/components/store/Pagination";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { countBooks, isBookSort, listBooks, listCategories } from "@/lib/repo";
import { isLocale, type Locale } from "@/lib/types";

const PAGE_SIZE = 24;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function toPage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/books">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang as Locale);
  return { title: d.books.title, description: d.books.subtitle };
}

export default async function BooksPage({ params, searchParams }: PageProps<"/[lang]/books">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const sp = await searchParams;
  const q = first(sp.q)?.slice(0, 80);
  const category = first(sp.category);
  const stockParam = first(sp.stock);
  const inStockOnly = stockParam === "1";
  const sortParam = first(sp.sort);
  const sort = isBookSort(sortParam) ? sortParam : "featured";
  const page = toPage(first(sp.page));

  const d = getDictionary(lang);

  const filter = { q, category, inStockOnly };
  const total = await countBooks(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const [books, categories] = await Promise.all([
    listBooks({ ...filter, sort, skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    listCategories(),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);
  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (category) query.category = category;
  if (inStockOnly) query.stock = "1";
  if (sort !== "featured") query.sort = sort;

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">
          {activeCategory ? (lang === "ar" ? activeCategory.nameAr : activeCategory.nameEn) : d.books.title}
        </h1>
        <p className="mt-2 text-ink-soft">{d.books.subtitle}</p>
      </header>

      <form method="get" action={`/${lang}/books`} className="mt-7 flex flex-wrap items-center gap-3">
        {category && <input type="hidden" name="category" value={category} />}
        <div className="relative min-w-56 flex-1">
          <label className="sr-only" htmlFor="catalog-search">
            {d.nav.search}
          </label>
          <input
            id="catalog-search"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={d.books.searchPlaceholder}
            className="field h-11 ps-10"
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
        <button type="submit" className="btn btn-primary h-11">
          {d.nav.search}
        </button>
        {q && (
          <Link href={`/${lang}/books${category ? `?category=${category}` : ""}`} className="btn btn-ghost h-11">
            {d.books.clearSearch}
          </Link>
        )}
        <CatalogControls lang={lang} sort={sort} inStockOnly={inStockOnly} />
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/${lang}/books`}
          className={`badge ${!category ? "badge-accent" : "badge-muted"} transition hover:bg-accent-soft`}
        >
          {d.books.allCategories}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/${lang}/books?category=${c.slug}`}
            className={`badge ${category === c.slug ? "badge-accent" : "badge-muted"} transition hover:bg-accent-soft`}
          >
            {lang === "ar" ? c.nameAr : c.nameEn}
            {typeof c.count === "number" && <span className="opacity-70">{c.count}</span>}
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted" role="status">
        {total === 1 ? d.books.resultsOne : d.books.results.replace("{n}", total.toLocaleString("en-US"))}
        {q && (
          <>
            {" · "}
            <span className="latin">{q}</span>
          </>
        )}
      </p>

      {books.length === 0 ? (
        <div className="card mt-6 p-12 text-center">
          <p className="text-lg font-semibold">{d.books.noResults}</p>
          <p className="mt-1.5 text-sm text-muted">{d.books.noResultsHint}</p>
          <Link href={`/${lang}/books`} className="btn btn-outline mt-6">
            {d.books.all}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {books.map((b, i) => (
            <BookCard key={b.id} book={b} lang={lang} priority={i < 6} />
          ))}
        </div>
      )}

      <Pagination lang={lang} page={current} totalPages={totalPages} basePath={`/${lang}/books`} query={query} />
    </div>
  );
}
