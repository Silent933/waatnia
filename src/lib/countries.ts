/** ISO-3166 alpha-2 codes with Arabic and English names for the checkout form. */
export type Country = { code: string; nameAr: string; nameEn: string };

export const COUNTRIES: Country[] = [
  { code: "SY", nameAr: "سوريا", nameEn: "Syria" },
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia" },
  { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates" },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait" },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar" },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain" },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman" },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan" },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon" },
  { code: "IQ", nameAr: "العراق", nameEn: "Iraq" },
  { code: "PS", nameAr: "فلسطين", nameEn: "Palestine" },
  { code: "EG", nameAr: "مصر", nameEn: "Egypt" },
  { code: "LY", nameAr: "ليبيا", nameEn: "Libya" },
  { code: "TR", nameAr: "تركيا", nameEn: "Turkey" },
  { code: "YE", nameAr: "اليمن", nameEn: "Yemen" },
  { code: "SD", nameAr: "السودان", nameEn: "Sudan" },
  { code: "DZ", nameAr: "الجزائر", nameEn: "Algeria" },
  { code: "MA", nameAr: "المغرب", nameEn: "Morocco" },
  { code: "TN", nameAr: "تونس", nameEn: "Tunisia" },
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States" },
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom" },
  { code: "CA", nameAr: "كندا", nameEn: "Canada" },
  { code: "AU", nameAr: "أستراليا", nameEn: "Australia" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France" },
  { code: "ES", nameAr: "إسبانيا", nameEn: "Spain" },
  { code: "IT", nameAr: "إيطاليا", nameEn: "Italy" },
  { code: "NL", nameAr: "هولندا", nameEn: "Netherlands" },
  { code: "SE", nameAr: "السويد", nameEn: "Sweden" },
  { code: "CH", nameAr: "سويسرا", nameEn: "Switzerland" },
  { code: "RU", nameAr: "روسيا", nameEn: "Russia" },
  { code: "BR", nameAr: "البرازيل", nameEn: "Brazil" },
  { code: "MX", nameAr: "المكسيك", nameEn: "Mexico" },
  { code: "ID", nameAr: "إندونيسيا", nameEn: "Indonesia" },
  { code: "MY", nameAr: "ماليزيا", nameEn: "Malaysia" },
  { code: "PK", nameAr: "باكستان", nameEn: "Pakistan" },
  { code: "IN", nameAr: "الهند", nameEn: "India" },
  { code: "PH", nameAr: "الفلبين", nameEn: "Philippines" },
  { code: "NG", nameAr: "نيجيريا", nameEn: "Nigeria" },
  { code: "ZA", nameAr: "جنوب أفريقيا", nameEn: "South Africa" },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryName(code: string, locale: "ar" | "en"): string {
  const found = byCode.get(code.toUpperCase());
  if (!found) return code;
  return locale === "ar" ? found.nameAr : found.nameEn;
}

export function isKnownCountry(code: string): boolean {
  return byCode.has(code.toUpperCase());
}
