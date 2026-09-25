import type { Settings } from "@/lib/types";

/**
 * Delivery is free across Syria and in Riyadh, and costs a flat fee elsewhere.
 * The owner edits both the country list and the city list from /admin/settings.
 */
export function isFreeShipping(
  country: string,
  city: string,
  settings: Pick<Settings, "freeCountries" | "freeCities">,
): boolean {
  const countryKey = (country || "").trim().toUpperCase();
  if (settings.freeCountries.some((c) => c.toUpperCase() === countryKey)) return true;

  const cityKey = normalizeCity(city);
  if (!cityKey) return false;
  return settings.freeCities.some((c) => normalizeCity(c) === cityKey);
}

function normalizeCity(value: string): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function shippingCost(
  country: string,
  city: string,
  settings: Pick<Settings, "freeCountries" | "freeCities" | "shippingFlatCents">,
): { costCents: number; free: boolean } {
  if (isFreeShipping(country, city, settings)) return { costCents: 0, free: true };
  return { costCents: Math.max(0, settings.shippingFlatCents), free: false };
}
