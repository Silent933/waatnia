import type { MetadataRoute } from "next";

import { getBookSlugs } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { LOCALES } from "@/lib/types";

const STATIC_PATHS = ["", "/books", "/categories", "/about", "/contact"];

/**
 * `/order` is a lookup form, not content — it is reachable but pointless in a
 * search index, so it is excluded here and marked `noindex` on the page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, slugs] = await Promise.all([getSettings(), getBookSlugs()]);
  const base = (settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://waatnia.vercel.app").replace(/\/$/, "");

  // Stamped once per request rather than per entry, and only when something
  // actually changed. `new Date()` inside the loop previously told crawlers
  // every page on the site was modified on every single deploy.
  const generatedAt = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const lang of LOCALES) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${base}/${lang}${path}`,
        lastModified: generatedAt,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : path === "/books" ? 0.9 : 0.5,
      });
    }
  }

  for (const slug of slugs) {
    for (const lang of LOCALES) {
      entries.push({
        url: `${base}/${lang}/books/${slug}`,
        lastModified: generatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: {
          languages: {
            ar: `${base}/ar/books/${slug}`,
            en: `${base}/en/books/${slug}`,
          },
        },
      });
    }
  }

  return entries;
}
