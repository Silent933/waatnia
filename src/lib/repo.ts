import "server-only";

import { cache } from "react";

import { jsonBookBySlug, jsonBooks, jsonCategories } from "@/lib/catalog-json";
import { normalizeForSearch } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isBookSort, type BookView, type BookSort, type CategoryView } from "@/lib/types";

export { isBookSort };
export type { BookSort };

const bookInclude = { category: true } as const;

/** Safe against both Prisma rows and the JSON fallback shape. */
function mapBook(row: {
  id: number;
  sourceId: number;
  slug: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  author: string | null;
  authorAr: string | null;
  cover: string;
  priceCents: number;
  stock: number;
  isCd: boolean;
  active: boolean;
  category: { slug: string; nameAr: string; nameEn: string } | null;
}): BookView {
  return {
    id: row.id,
    sourceId: row.sourceId,
    slug: row.slug,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    descAr: row.descAr,
    descEn: row.descEn,
    author: row.author,
    authorAr: row.authorAr,
    cover: row.cover,
    priceCents: row.priceCents,
    stock: row.stock,
    isCd: row.isCd,
    active: row.active,
    categorySlug: row.category?.slug ?? null,
    categoryAr: row.category?.nameAr ?? null,
    categoryEn: row.category?.nameEn ?? null,
  };
}

export type BookSortQuery = BookSort;

function haystack(b: BookView): string {
  return normalizeForSearch(`${b.titleAr} ${b.titleEn} ${b.descAr} ${b.descEn}`);
}

function sortJson(list: BookView[], sort: BookSort): BookView[] {
  const copy = [...list];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => b.sourceId - a.sourceId);
    case "price-asc":
      return copy.sort((a, b) => a.priceCents - b.priceCents || a.sourceId - b.sourceId);
    case "price-desc":
      return copy.sort((a, b) => b.priceCents - a.priceCents || a.sourceId - b.sourceId);
    default:
      return copy.sort((a, b) => a.sourceId - b.sourceId);
  }
}

export async function listBooks(params: {
  q?: string;
  category?: string;
  sort?: BookSort;
  inStockOnly?: boolean;
  skip?: number;
  take?: number;
} = {}): Promise<BookView[]> {
  const { q, category, sort = "featured", inStockOnly = false, skip = 0, take } = params;

  if (prisma) {
    const where: Record<string, unknown> = { active: true };
    if (category) where.category = { slug: category };
    if (inStockOnly) where.stock = { gt: 0 };
    if (q) {
      // Escape LIKE metacharacters. Prisma parameterises the value so this is
      // not an injection risk, but an unescaped % or _ would silently widen
      // the match and defeat the search.
      where.searchText = { contains: normalizeForSearch(q).replace(/[\\%_]/g, (c) => `\\${c}`) };
    }

    const orderBy =
      sort === "newest"
        ? { sourceId: "desc" }
        : sort === "price-asc"
          ? { priceCents: "asc" }
          : sort === "price-desc"
            ? { priceCents: "desc" }
            : { sourceId: "asc" };

    const rows = await prisma.book.findMany({
      where,
      include: bookInclude,
      orderBy: orderBy as never,
      skip,
      ...(take ? { take } : {}),
    });
    return rows.map((r) => mapBook(r as never));
  }

  let list = jsonBooks;
  if (category) list = list.filter((b) => b.categorySlug === category);
  if (inStockOnly) list = list.filter((b) => b.stock > 0);
  if (q) {
    const needle = normalizeForSearch(q);
    if (needle) list = list.filter((b) => haystack(b).includes(needle));
  }
  list = sortJson(list, sort);
  return take ? list.slice(skip, skip + take) : list.slice(skip);
}

export const getBookBySlug = cache(async (slug: string): Promise<BookView | null> => {
  if (prisma) {
    // `active: true` matters here as much as in listBooks: archiving a book is
    // how the owner hides a title, and without this filter the product page
    // stayed reachable at its URL even though it had left the catalog.
    const row = await prisma.book.findFirst({ where: { slug, active: true }, include: bookInclude });
    return row ? mapBook(row as never) : null;
  }
  const book = jsonBookBySlug.get(slug) ?? null;
  return book?.active ? book : null;
});

export const getBookById = cache(async (id: number): Promise<BookView | null> => {
  if (prisma) {
    const row = await prisma.book.findUnique({ where: { id }, include: bookInclude });
    return row ? mapBook(row as never) : null;
  }
  return jsonBooks.find((b) => b.id === id) ?? null;
});

export async function getRelatedBooks(book: BookView, limit = 4): Promise<BookView[]> {
  // Bound the read. Without a `take` this pulled an entire category — or the
  // whole 112-book catalog when the book has no category — on every one of the
  // product pages at build time.
  const list = await listBooks({ category: book.categorySlug ?? undefined, take: 40 });
  const others = list.filter((b) => b.id !== book.id);
  const sameCategory = others.filter((b) => b.categorySlug === book.categorySlug);
  const rest = others.filter((b) => b.categorySlug !== book.categorySlug);
  return [...sameCategory, ...rest].slice(0, limit);
}

/**
 * Slugs for generateStaticParams.
 *
 * Runs on every Vercel build, so a database that is briefly unreachable — a
 * cold pooler, a Supabase maintenance window, a network blip — would otherwise
 * fail the whole deploy. Fall back to the bundled catalog instead: the routes
 * still get prerendered, and a follow-up deploy picks up the live data.
 */
export async function getBookSlugs(): Promise<string[]> {
  if (prisma) {
    try {
      const rows = await prisma.book.findMany({ where: { active: true }, select: { slug: true } });
      return rows.map((r) => r.slug);
    } catch (error) {
      console.error("getBookSlugs: database unreachable, falling back to the bundled catalog.", error);
    }
  }
  return jsonBooks.filter((b) => b.active).map((b) => b.slug);
}

export async function listCategories(): Promise<CategoryView[]> {
  if (prisma) {
    const rows = await prisma.category.findMany({
      orderBy: { sort: "asc" },
      include: { _count: { select: { books: { where: { active: true } } } } },
    });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      count: c._count.books,
    }));
  }

  const counts = new Map<string, number>();
  for (const b of jsonBooks) {
    if (!b.active || !b.categorySlug) continue;
    counts.set(b.categorySlug, (counts.get(b.categorySlug) ?? 0) + 1);
  }
  return jsonCategories.map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }));
}

export async function countBooks(
  params: { q?: string; category?: string; inStockOnly?: boolean } = {},
): Promise<number> {
  const { q, category, inStockOnly = false } = params;
  if (prisma) {
    const where: Record<string, unknown> = { active: true };
    if (category) where.category = { slug: category };
    if (inStockOnly) where.stock = { gt: 0 };
    if (q) where.searchText = { contains: normalizeForSearch(q) };
    return prisma.book.count({ where: where as never });
  }
  const list = await listBooks(params);
  return list.length;
}

export async function getCatalogStats(): Promise<{ books: number; categories: number; stock: number }> {
  if (prisma) {
    const [books, categories, agg] = await Promise.all([
      prisma.book.count({ where: { active: true } }),
      prisma.category.count(),
      prisma.book.aggregate({ where: { active: true }, _sum: { stock: true } }),
    ]);
    return { books, categories, stock: agg._sum.stock ?? 0 };
  }
  const active = jsonBooks.filter((b) => b.active);
  return {
    books: active.length,
    categories: new Set(active.map((b) => b.categorySlug).filter(Boolean)).size,
    stock: active.reduce((sum, b) => sum + b.stock, 0),
  };
}
