import Link from "next/link";

import { CoverImage } from "@/components/store/CoverImage";
import { Price } from "@/components/store/Price";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { BookView, Locale } from "@/lib/types";

export function BookCard({
  book,
  lang,
  priority = false,
}: {
  book: BookView;
  lang: Locale;
  priority?: boolean;
}) {
  const d = getDictionary(lang);
  const href = `/${lang}/books/${book.slug}`;
  const categoryLabel = lang === "ar" ? book.categoryAr : book.categoryEn;
  const outOfStock = book.stock <= 0;

  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={href} className="block focus-visible:outline-none">
        <div className="relative aspect-square overflow-hidden bg-sunken">
          <CoverImage
            src={book.cover}
            alt={book.titleEn}
            sizes="(min-width:1280px) 20vw, (min-width:768px) 30vw, 45vw"
            priority={priority}
            className="transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
            {categoryLabel && <span className="badge badge-accent">{categoryLabel}</span>}
            {book.isCd && <span className="badge badge-muted ms-auto">CD</span>}
          </div>
          {outOfStock && (
            <div className="absolute inset-0 grid place-items-center bg-paper/75">
              <span className="badge badge-danger">{d.books.outOfStock}</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <h3 className="latin text-[15px] font-bold leading-snug text-ink">{book.titleEn}</h3>
          {book.titleAr && (
            <p className="line-clamp-1 text-[13px] leading-relaxed text-muted">{book.titleAr}</p>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-3.5 py-2.5">
        <Price cents={book.priceCents} className="text-base font-bold text-accent" />
        {outOfStock ? (
          <span className="text-xs font-semibold text-muted">{d.books.outOfStock}</span>
        ) : book.stock <= 5 ? (
          <span className="text-xs font-semibold text-warn">
            {d.books.lowStock.replace("{n}", String(book.stock))}
          </span>
        ) : (
          <span className="text-xs font-semibold text-ok">{d.books.inStock}</span>
        )}
      </div>
    </article>
  );
}
