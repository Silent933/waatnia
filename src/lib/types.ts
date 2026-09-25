export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

export function dir(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export const CURRENCIES = ["USD", "SAR", "SYP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(v: string): v is Currency {
  return (CURRENCIES as readonly string[]).includes(v);
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  SAR: "ر.س",
  SYP: "ل.س",
};

/** Order status flow: new -> confirmed -> shipped -> delivered, cancellable from any step. */
export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

export const PAYMENT_METHODS = ["cod", "bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const BOOK_SORTS = ["featured", "newest", "price-asc", "price-desc"] as const;
export type BookSort = (typeof BOOK_SORTS)[number];

export function isBookSort(v: string | undefined): v is BookSort {
  return !!v && (BOOK_SORTS as readonly string[]).includes(v);
}

/** Presentation shape every page consumes, regardless of whether it came from
 *  Postgres or the JSON fallback. Keeps pages free of Prisma types. */
export type BookView = {
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
  categorySlug: string | null;
  categoryAr: string | null;
  categoryEn: string | null;
};

export type CategoryView = {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  count?: number;
};

export type Settings = {
  usdPerSar: number;
  sypPerSar: number;
  defaultPriceCents: number;
  currencyDefault: Currency;
  shippingFlatCents: number;
  freeCountries: string[];
  freeCities: string[];
  storeNameAr: string;
  storeNameEn: string;
  taglineAr: string;
  taglineEn: string;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactEmail: string | null;
  contactAddressAr: string | null;
  contactAddressEn: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankIban: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  telegramUrl: string | null;
  siteUrl: string | null;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescAr: string | null;
  seoDescEn: string | null;
};
