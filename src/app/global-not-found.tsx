import Link from "next/link";

/**
 * Rendered for any URL that matches no route (and for unmatched locales).
 * Because the project uses two root layouts, this file supplies its own
 * <html>/<body> shell.
 */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body
        className="grid min-h-dvh place-items-center bg-paper px-6 text-ink"
        style={{ fontFamily: "var(--font-arabic-body, system-ui), system-ui, sans-serif" }}
      >
        <div className="max-w-md text-center">
          <p className="text-6xl font-bold text-accent">404</p>
          <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1>
          <p className="mt-2 text-ink-soft">ربما تم نقل الصفحة أو أن الرابط غير صحيح.</p>
          <Link href="/ar" className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-white">
            العودة إلى الرئيسية
          </Link>
        </div>
      </body>
    </html>
  );
}
