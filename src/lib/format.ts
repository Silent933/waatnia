/**
 * PDF titles arrive lowercased ("a tale of two cities"). The storefront shows
 * English titles prominently, so we restore conventional title case while
 * leaving digits and known acronyms alone.
 */

const SMALL_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "for", "of", "in", "on",
  "at", "to", "by", "with", "from", "as", "is",
]);

const ACRONYMS = new Set(["cd", "tv", "dvd", "usb", "pdf", "mp3"]);

/** Overrides for titles where naive capitalisation would look wrong. */
const TITLE_OVERRIDES: Record<string, string> = {
  "twenty thousand leagues under the sea": "Twenty Thousand Leagues Under the Sea",
};

function capWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  if (/\d/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function smartTitle(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const override = TITLE_OVERRIDES[trimmed.toLowerCase()];
  if (override) return override;

  const words = trimmed.split(" ");
  return words
    .map((word, i) => {
      const isEdge = i === 0 || i === words.length - 1;
      if (!isEdge && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      return word.split("-").map(capWord).join("-");
    })
    .join(" ");
}

export function slugify(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Catalog contains 21 duplicated titles, so the entry id is appended to keep slugs unique. */
export function bookSlug(titleEn: string, sourceId: number): string {
  const base = slugify(smartTitle(titleEn));
  return `${base || "book"}-${sourceId}`;
}

export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // Arabic diacritics + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Timezone the shop operates in. Order timestamps are stored in UTC; without
 * pinning this, `Intl.DateTimeFormat` falls back to the server's zone, which on
 * Vercel is UTC — so every time in the dashboard was silently three hours
 * behind the customer's clock.
 */
export const SHOP_TIME_ZONE = "Asia/Damascus";

/** Formats an admin-facing timestamp in the shop's timezone. */
export function formatDateTime(
  value: Date | string,
  style: "short" | "medium" = "medium",
): string {
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: style === "short" ? "short" : "medium",
    timeStyle: "short",
    numberingSystem: "latn",
    timeZone: SHOP_TIME_ZONE,
  }).format(typeof value === "string" ? new Date(value) : value);
}
