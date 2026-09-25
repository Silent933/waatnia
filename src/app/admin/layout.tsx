import { Amiri, Inter, Noto_Sans_Arabic } from "next/font/google";

import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });
const notoArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-noto-arabic", display: "swap" });

export const metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false },
};

/**
 * Every dashboard page is cookie-gated and database-backed, so none of it may
 * ever be prerendered. Without this, building without DATABASE_URL makes
 * `getAdmin()` bail out before it reads `cookies()`, Next marks the segment
 * static, and the guard silently stops running.
 */
export const dynamic = "force-dynamic";

/**
 * Second root layout: the dashboard is Arabic-only, RTL, and deliberately has
 * none of the storefront chrome. Auth is enforced one level down in
 * app/admin/(protected)/layout.tsx so that /admin/login stays reachable.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${amiri.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
