import "server-only";

import { revalidatePath } from "next/cache";

import { LOCALES, type Locale } from "./types";

/**
 * The storefront lives under a dynamic `[lang]` segment, so a literal
 * `revalidatePath("/[lang]/books")` does not reliably match the generated
 * routes. These helpers expand the segment into the concrete locale paths
 * instead.
 */

/** Revalidate a storefront subtree for every locale, e.g. `revalidateStore("books")`. */
export function revalidateStore(segment?: string): void {
  for (const lang of LOCALES) {
    if (segment) revalidatePath(`/${lang}/${segment}`, "page");
    else revalidatePath(`/${lang}`, "layout");
  }
}

/** Revalidate the book list plus the detail page of the given books. */
export function revalidateBooks(slugs: string[] = []): void {
  revalidateStore("books");
  for (const lang of LOCALES) {
    for (const slug of slugs) {
      if (slug) revalidatePath(`/${lang}/books/${slug}`, "page");
    }
  }
}

/** Revalidate the home page (newest books, featured carousel) for every locale. */
export function revalidateHome(): void {
  for (const lang of LOCALES) revalidatePath(`/${lang}`, "page");
}

export function revalidateLang(lang: Locale, path = ""): void {
  revalidatePath(`/${lang}${path}`, "page");
}
