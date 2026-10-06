import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { BookCard } from "@/components/store/BookCard";
import { CoverImage } from "@/components/store/CoverImage";
import { NotFoundScreen } from "@/components/store/NotFoundScreen";
import { Price } from "@/components/store/Price";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getBookBySlug, getBookSlugs, getRelatedBooks, listCategories } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "@/lib/types";

export async function generateStaticParams() {
  const slugs = await getBookSlugs();
  return LOCALES.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/books/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const d = getDictionary(isLocale(lang) ? lang : DEFAULT_LOCALE);
  if (!isLocale(lang)) return { title: d.notFound.title, robots: { index: false, follow: false } };
  const book = await getBookBySlug(slug);
  if (!book) return { title: d.notFound.title, robots: { index: false, follow: false } };

  const description = (lang === "ar" ? book.descAr : book.descEn).slice(0, 200);

  return {
    title: `${book.titleEn}${book.titleAr ? ` — ${book.titleAr}` : ""}`,
    description,
    alternates: {
      canonical: `/${lang}/books/${book.slug}`,
      languages: {
        ar: `/ar/books/${book.slug}`,
        en: `/en/books/${book.slug}`,
        "x-default": `/ar/books/${book.slug}`,
      },
    },
    openGraph: {
      type: "book",
      title: book.titleEn,
      description,
      images: [{ url: book.cover }],
      locale: lang === "ar" ? "ar_SY" : "en_US",
    },
  };
}

export default async function BookDetailPage({ params }: PageProps<"/[lang]/books/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const book = await getBookBySlug(slug);
  // A missing book renders the branded 404 screen in place rather than calling
  // notFound(): with the root layout under the `[lang]` segment, a thrown
  // notFound() escapes every not-found boundary and lands on a blank error
  // document. The status is 200 here, so generateMetadata marks it noindex.
  if (!book) return <NotFoundScreen lang={lang} />;

  const d = getDictionary(lang);
  const [related, categories, settings] = await Promise.all([
    getRelatedBooks(book, 4),
    listCategories(),
    getSettings(),
  ]);

  const siteUrl =
    settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://waatnia.vercel.app";
  const category = categories.find((c) => c.slug === book.categorySlug);
  const outOfStock = book.stock <= 0;
  const priceSar = (book.priceCents / 100).toFixed(2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.titleEn,
    alternateName: book.titleAr || undefined,
    description: book.descEn || book.descAr,
    image: [`${siteUrl}${book.cover}`],
    inLanguage: ["ar", "en"],
    bookFormat: "https://schema.org/Audiobook",
    ...(book.author ? { author: { "@type": "Person", name: book.author } } : {}),
    ...(category ? { genre: lang === "ar" ? category.nameAr : category.nameEn } : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/${lang}/books/${book.slug}`,
      price: priceSar,
      priceCurrency: "SAR",
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  const details = [
    { label: d.book.category, value: category ? (lang === "ar" ? category.nameAr : category.nameEn) : null },
    { label: d.book.author, value: lang === "ar" ? book.authorAr || book.author : book.author },
    { label: d.book.stock, value: outOfStock ? d.books.outOfStock : String(book.stock) },
  ].filter((x) => !!x.value);

  return (
    <div className="container-page py-8">
      {/* JSON.stringify does not escape "<", so a "</script>" inside any title
          or description would close this tag and execute. Escaping "<" as
          "<" is valid JSON and cannot terminate the element. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />


      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href={`/${lang}`} className="transition hover:text-accent">
          {d.nav.home}
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/${lang}/books`} className="transition hover:text-accent">
          {d.nav.catalog}
        </Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/${lang}/books?category=${category.slug}`} className="transition hover:text-accent">
              {lang === "ar" ? category.nameAr : category.nameEn}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="card relative aspect-square overflow-hidden bg-sunken">
          <CoverImage
            src={book.cover}
            alt={book.titleEn}
            sizes="(min-width:1024px) 22rem, 100vw"
            priority
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <Link href={`/${lang}/books?category=${category.slug}`} className="badge badge-accent">
                {lang === "ar" ? category.nameAr : category.nameEn}
              </Link>
            )}
            {book.isCd && <span className="badge badge-muted">{d.books.cd}</span>}
            <span className={`badge ${outOfStock ? "badge-danger" : "badge-ok"}`}>
              {outOfStock ? d.books.outOfStock : d.books.inStock}
            </span>
          </div>

          {/* English title leads, Arabic sits beneath it in a smaller face. */}
          <h1 className="latin mt-4 text-3xl font-bold leading-tight sm:text-4xl">{book.titleEn}</h1>
          {book.titleAr && <p className="mt-1.5 text-xl text-muted">{book.titleAr}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Price cents={book.priceCents} className="text-3xl font-bold text-accent" />
            <AddToCartButton book={book} lang={lang} />
          </div>

          <div className="mt-8">
            <h2 className="text-lg">{d.book.description}</h2>
            <div className="mt-3 space-y-4">
              <p className="text-ink-soft">{book.descEn}</p>
              {book.descAr && (
                <p className="prose-ar text-ink-soft" dir="rtl">
                  {book.descAr}
                </p>
              )}
            </div>
          </div>

          {details.length > 0 && (
            <div className="card mt-8 divide-y divide-line">
              {details.map((x) => (
                <div key={x.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-muted">{x.label}</span>
                  <span className="text-sm font-semibold">{x.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl">{d.book.related}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((b) => (
              <BookCard key={b.id} book={b} lang={lang} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12">
        <Link href={`/${lang}/books`} className="btn btn-outline">
          ← {d.book.backToCatalog}
        </Link>
      </div>
    </div>
  );
}
