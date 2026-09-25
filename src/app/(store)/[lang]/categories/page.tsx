import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { listCategories } from "@/lib/repo";
import { isLocale } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/categories">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).nav.categories };
}

export default async function CategoriesPage({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);
  const categories = await listCategories();

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{d.nav.categories}</h1>
        <p className="mt-2 text-ink-soft">{d.books.subtitle}</p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/${lang}/books?category=${c.slug}`}
            className="card group flex items-center justify-between gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div>
              <p className="text-lg font-bold">{lang === "ar" ? c.nameAr : c.nameEn}</p>
              <p className="mt-1 text-sm text-muted">
                {typeof c.count === "number"
                  ? c.count === 1
                    ? d.books.resultsOne
                    : d.books.results.replace("{n}", c.count.toLocaleString("en-US"))
                  : ""}
              </p>
            </div>
            <span className="text-muted transition group-hover:text-accent">
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2 rtl:rotate-180">
                <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
