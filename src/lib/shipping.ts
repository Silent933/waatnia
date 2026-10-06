import type { Settings } from "@/lib/types";

/**
 * Folds the Arabic orthographic variants that make exact string comparison
 * unreliable: أ/إ/آ→ا, ى→ي, ة→ه, ؤ/ئ→و/ي, and Arabic diacritics. Without
 * this, a customer who types "الرياض" with a tanwin or an alef variant is
 * silently charged shipping.
 */
function foldArabic(value: string): string {
  return value
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // harakat, superscript alef, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[‌-‏]/g, "") // ZWNJ/ZWJ/LRM/RLM
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCity(value: string): string {
  return foldArabic(value || "");
}

/**
 * A `freeCities` entry is scoped to a country as `SA:الرياض`. An entry with no
 * prefix is matched in any country, which is how the list used to behave — but
 * that let a customer shipping to, say, Egypt claim free shipping by typing
 * "Riyadh", so always give the prefix.
 */
function matchesFreeCity(entry: string, country: string, city: string): boolean {
  const separator = entry.indexOf(":");
  if (separator === -1) return normalizeCity(entry) === city;
  const entryCountry = entry.slice(0, separator).trim().toUpperCase();
  return entryCountry === country && normalizeCity(entry.slice(separator + 1)) === city;
}

/**
 * Delivery is free across the countries in `freeCountries`, plus any city
 * matched by `freeCities`. Everything else costs the flat fee. Both lists are
 * edited from /admin/settings.
 */
export function isFreeShipping(
  country: string,
  city: string,
  settings: Pick<Settings, "freeCountries" | "freeCities">,
): boolean {
  const countryKey = (country || "").trim().toUpperCase();
  if (settings.freeCountries.some((c) => c.trim().toUpperCase() === countryKey)) return true;

  const cityKey = normalizeCity(city);
  if (!cityKey) return false;
  return settings.freeCities.some((entry) => matchesFreeCity(entry, countryKey, cityKey));
}

export function shippingCost(
  country: string,
  city: string,
  settings: Pick<Settings, "freeCountries" | "freeCities" | "shippingFlatCents">,
): { costCents: number; free: boolean } {
  if (isFreeShipping(country, city, settings)) return { costCents: 0, free: true };
  return { costCents: Math.max(0, settings.shippingFlatCents), free: false };
}
