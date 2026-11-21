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

  const categoryName = lang === "ar" ? book.categoryAr : book.categoryEn;
  const titleBase = lang === "ar" ? book.titleAr || book.titleEn : book.titleEn;
  const title = categoryName ? `${titleBase} — ${categoryName}` : titleBase;
  const story = (lang === "ar" ? book.descAr : book.descEn).replace(/\s+/g, " ").trim();
  const description = [
    story.slice(0, 120),
    categoryName,
    book.isCd ? d.books.cd : null,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 160);

  return {
    title,
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
      title,
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

  const pageUrl = `${siteUrl}/${lang}/books/${book.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Book", "Product"],
    name: lang === "ar" ? book.titleAr || book.titleEn : book.titleEn,
    alternateName: lang === "ar" ? book.titleEn : book.titleAr || undefined,
    description: (lang === "ar" ? book.descAr : book.descEn) || book.descEn || book.descAr,
    image: [`${siteUrl}${book.cover}`],
    inLanguage: ["ar", "en"],
    bookFormat: "https://schema.org/Paperback",
    ...(book.author ? { author: { "@type": "Person", name: book.author } } : {}),
    ...(category ? { genre: lang === "ar" ? category.nameAr : category.nameEn } : {}),
    ...(book.isCd
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "CD",
            value: d.books.cd,
          },
        }
      : {}),
    mainEntityOfPage: pageUrl,
    offers: {
      "@type": "Offer",
      url: pageUrl,
      price: priceSar,
      priceCurrency: "SAR",
      itemCondition: "https://schema.org/NewCondition",
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: lang === "ar" ? settings.storeNameAr : settings.storeNameEn,
        url: siteUrl,
      },
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
              <p
                className={lang === "ar" ? "prose-ar text-ink-soft" : "text-ink-soft"}
                dir={lang === "ar" ? "rtl" : undefined}
              >
                {lang === "ar" ? book.descAr || book.descEn : book.descEn || book.descAr}
              </p>
              {lang === "ar" && book.descEn && book.descEn !== book.descAr && (
                <p className="latin text-sm text-muted" dir="ltr">
                  {book.descEn}
                </p>
             )}
              {lang === "en" && book.descAr && book.descAr !== book.descEn && (
                <p className="prose-ar text-sm text-muted" dir="rtl">
                  {book.descAr}
                </p>
              )}
            </div>
          </div>

          <section className="card mt-6 p-5">
            <h2 className="text-lg">{d.book.contextTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {lang === "ar"
                ? `إذا كنت تبحث عن ${category ? `قصص ${category.nameAr}` : "قصة مميزة"} أو عن رواية ${book.titleAr || book.titleEn}، فأنت في المكان الصحيح. اكتشف القصة وتصفّح عناوين مشابهة في الكتالوج.`
                : `Looking for ${category ? `${category.nameEn} stories` : "a great story"} or the full story of ${book.titleEn}? Discover it here and browse similar titles in the catalog.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {category && (
                <Link href={`/${lang}/books?category=${category.slug}`} className="badge badge-muted">
                  {lang === "ar" ? category.nameAr : category.nameEn}
                </Link>
              )}
              <Link href={`/${lang}/books`} className="badge badge-muted">
                {d.nav.catalog}
              </Link>
            </div>
          </section>

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
