import "server-only";

import arTitles from "../../data/ar-titles.json";
import catalog from "../../data/catalog.json";
import siteJson from "../../data/site.json";

import { bookSlug, smartTitle } from "@/lib/format";
import type { BookView, CategoryView, Currency, Settings } from "@/lib/types";

type RawCatalogEntry = {
  id: number;
  source_pdf: string;
  page: number;
  title_en: string;
  desc_ar_raw: string;
  desc_en_raw: string;
  stock: number;
  cover: string;
  cover_w: number;
  cover_h: number;
  has_cd_tag: boolean;
};

type ArTitles = {
  categories: { slug: string; ar: string; en: string }[];
  books: Record<string, { ar: string; cat: string; author?: string; author_ar?: string }>;
};

const titles = arTitles as ArTitles;
const DEFAULT_PRICE_CENTS = 3000;

const categoryBySlug = new Map(titles.categories.map((c) => [c.slug, c]));

export const jsonCategories: CategoryView[] = titles.categories.map((c, i) => ({
  id: i + 1,
  slug: c.slug,
  nameAr: c.ar,
  nameEn: c.en,
}));

export const jsonBooks: BookView[] = (catalog as RawCatalogEntry[]).map((entry) => {
  const meta = titles.books[String(entry.id)];
  const category = meta ? categoryBySlug.get(meta.cat) : undefined;
  return {
    id: entry.id,
    sourceId: entry.id,
    slug: bookSlug(entry.title_en, entry.id),
    titleAr: meta?.ar ?? "",
    titleEn: smartTitle(entry.title_en),
    descAr: entry.desc_ar_raw ?? "",
    descEn: entry.desc_en_raw ?? "",
    author: meta?.author ?? null,
    authorAr: meta?.author_ar ?? null,
    // catalog.json points at the source folder; the site serves them from /public/covers
    cover: entry.cover.replace(/^imag\/covers\//, "/covers/"),
    priceCents: DEFAULT_PRICE_CENTS,
    stock: entry.stock,
    isCd: entry.has_cd_tag,
    active: true,
    categorySlug: category?.slug ?? null,
    categoryAr: category?.ar ?? null,
    categoryEn: category?.en ?? null,
  };
});

export const jsonSettings: Settings = {
  ...(siteJson as Omit<Settings, "freeCountries" | "freeCities" | "currencyDefault">),
  freeCountries: siteJson.freeCountries as string[],
  freeCities: siteJson.freeCities as string[],
  currencyDefault: siteJson.currencyDefault as Currency,
};

export const jsonBookBySlug = new Map(jsonBooks.map((b) => [b.slug, b]));

export function jsonTotalStock(): number {
  return jsonBooks.reduce((sum, b) => sum + b.stock, 0);
}
