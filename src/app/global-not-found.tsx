/**
 * Answers every URL that matches no route. The store's own `not-found.tsx`
 * cannot cover these: it lives under the `[lang]` root layout, and a path that
 * resolves to nothing never enters that layout — which is exactly the situation
 * this file exists for, together with the project's second root layout.
 *
 * Next skips all layout rendering here, so the page re-declares the fonts, the
 * stylesheet and the <html>/<body> shell itself. That is also why the locale
 * arrives as a request header from `proxy` instead of a route param.
 */
import type { Metadata } from "next";
import { Amiri, Inter, Noto_Sans_Arabic, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";

import { NotFoundScreen } from "@/components/store/NotFoundScreen";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, LOCALE_HEADER, dir, isLocale } from "@/lib/types";

import "@/app/globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });
const notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-noto-arabic", display: "swap" });

async function resolveLang() {
  const carried = (await headers()).get(LOCALE_HEADER) ?? "";
  return isLocale(carried) ? carried : DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const d = getDictionary(await resolveLang());
  return {
    title: `${d.notFound.code} · ${d.notFound.title}`,
    robots: { index: false, follow: false },
    icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
  };
}

export default async function GlobalNotFound() {
  const lang = await resolveLang();

  return (
    <html
      lang={lang}
      dir={dir(lang)}
      className={`${playfair.variable} ${inter.variable} ${amiri.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-paper text-ink">
        <div className="flex min-h-dvh flex-col justify-center">
          <NotFoundScreen lang={lang} />
        </div>
      </body>
    </html>
  );
}
