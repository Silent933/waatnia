import "server-only";

import { cache } from "react";

import type { Prisma } from "@prisma/client";

import { jsonSettings } from "@/lib/catalog-json";
import { prisma } from "@/lib/prisma";
import type { Currency, Settings } from "@/lib/types";

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return fallback;
}

export function rowToSettings(row: Record<string, unknown>): Settings {
  return {
    usdPerSar: Number(row.usdPerSar ?? 3.75),
    sypPerSar: Number(row.sypPerSar ?? 40),
    defaultPriceCents: Math.round(Number(row.defaultPriceCents ?? 3000)),
    currencyDefault: (row.currencyDefault as Currency) ?? "USD",
    shippingFlatCents: Math.round(Number(row.shippingFlatCents ?? 5000)),
    freeCountries: asStringArray(row.freeCountries, jsonSettings.freeCountries),
    freeCities: asStringArray(row.freeCities, jsonSettings.freeCities),
    storeNameAr: String(row.storeNameAr ?? jsonSettings.storeNameAr),
    storeNameEn: String(row.storeNameEn ?? jsonSettings.storeNameEn),
    taglineAr: String(row.taglineAr ?? jsonSettings.taglineAr),
    taglineEn: String(row.taglineEn ?? jsonSettings.taglineEn),
    contactPhone: (row.contactPhone as string) ?? null,
    contactWhatsapp: (row.contactWhatsapp as string) ?? null,
    contactEmail: (row.contactEmail as string) ?? null,
    contactAddressAr: (row.contactAddressAr as string) ?? null,
    contactAddressEn: (row.contactAddressEn as string) ?? null,
    bankName: (row.bankName as string) ?? null,
    bankAccountName: (row.bankAccountName as string) ?? null,
    bankIban: (row.bankIban as string) ?? null,
    instagramUrl: (row.instagramUrl as string) ?? null,
    facebookUrl: (row.facebookUrl as string) ?? null,
    telegramUrl: (row.telegramUrl as string) ?? null,
    siteUrl: (row.siteUrl as string) ?? null,
    seoTitleAr: (row.seoTitleAr as string) ?? null,
    seoTitleEn: (row.seoTitleEn as string) ?? null,
    seoDescAr: (row.seoDescAr as string) ?? null,
    seoDescEn: (row.seoDescEn as string) ?? null,
  };
}

/**
 * Deduplicated per request by React `cache`. Falls back to data/site.json so the
 * storefront renders before a database exists; once connected, the DB row wins.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  if (!prisma) return jsonSettings;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    if (!row) return jsonSettings;
    return rowToSettings(row as unknown as Record<string, unknown>);
  } catch {
    return jsonSettings;
  }
});

export async function updateSettings(
  data: Prisma.SiteSettingUncheckedUpdateInput,
): Promise<Settings> {
  if (!prisma) throw new Error("DATABASE_URL is not configured.");
  const existing = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  const row = existing
    ? await prisma.siteSetting.update({ where: { id: 1 }, data })
    : await prisma.siteSetting.create({
        data: { id: 1, ...data } as Prisma.SiteSettingUncheckedCreateInput,
      });
  return rowToSettings(row as unknown as Record<string, unknown>);
}
