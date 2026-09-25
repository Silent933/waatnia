import type { Metadata, Viewport } from "next";
import { Amiri, Inter, Noto_Sans_Arabic, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";

import Footer from "@/components/store/Footer";
import Header from "@/components/store/Header";
import { CurrencyProvider } from "@/components/store/CurrencyProvider";
import { CartHydration } from "@/components/cart/CartHydration";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listCategories } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { DEFAULT_LOCALE, LOCALES, dir, isLocale } from "@/lib/types";

import "@/app/globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#faf7f1",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const safeLang = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const settings = await getSettings();
  const base =
    settings.siteUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://waatnia.vercel.app";

  const title =
    (safeLang === "ar" ? settings.seoTitleAr : settings.seoTitleEn) ||
    (safeLang === "ar" ? settings.storeNameAr : settings.storeNameEn);
  const description =
    (safeLang === "ar" ? settings.seoDescAr : settings.seoDescEn) ||
    (safeLang === "ar" ? settings.taglineAr : settings.taglineEn);

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s · ${safeLang === "ar" ? settings.storeNameAr : settings.storeNameEn}` },
    description,
    alternates: {
      canonical: `/${safeLang}`,
      languages: { ar: "/ar", en: "/en", "x-default": `/${DEFAULT_LOCALE}` },
    },
    openGraph: {
      type: "website",
      siteName: safeLang === "ar" ? settings.storeNameAr : settings.storeNameEn,
      title,
      description,
      locale: safeLang === "ar" ? "ar_SY" : "en_US",
      url: `/${safeLang}`,
    },
    icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
  };
}

export default async function StoreLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);

  return (
    <html
      lang={lang}
      dir={dir(lang)}
      className={`${playfair.variable} ${inter.variable} ${amiri.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <CartHydration />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
        >
          {getDictionary(lang).nav.catalog}
        </a>
        <CurrencyProvider
          defaultCurrency={settings.currencyDefault}
          rates={{ usdPerSar: settings.usdPerSar, sypPerSar: settings.sypPerSar }}
          locale={lang}
        >
          <Header
            lang={lang}
            storeName={lang === "ar" ? settings.storeNameAr : settings.storeNameEn}
            tagline={lang === "ar" ? settings.taglineAr : settings.taglineEn}
            categories={categories}
          />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer
            lang={lang}
            storeName={lang === "ar" ? settings.storeNameAr : settings.storeNameEn}
            settings={settings}
          />
        </CurrencyProvider>
      </body>
    </html>
  );
}
