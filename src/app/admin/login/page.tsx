import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "./LoginForm";
import { getAdmin } from "@/lib/auth";
import { hasDatabase } from "@/lib/prisma";

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover ring-1 ring-line" />
          <h1 className="mt-3 text-2xl font-bold">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-muted">سجّل الدخول لإدارة المتجر</p>
        </div>

        {hasDatabase() ? (
          <LoginForm />
        ) : (
          <div className="card p-6">
            <p className="text-sm font-semibold text-danger">قاعدة البيانات غير مربوطة</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              أضف <code className="latin rounded bg-sunken px-1">DATABASE_URL</code> إلى ملف{" "}
              <code className="latin rounded bg-sunken px-1">.env</code>، ثم شغّل:
            </p>
            <pre className="latin mt-3 overflow-x-auto rounded-lg bg-sunken p-3 text-xs">
{`npm run db:push
npm run db:seed`}
            </pre>
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/ar" className="text-muted underline underline-offset-4 transition hover:text-accent">
            العودة إلى المتجر
          </Link>
        </p>
      </div>
    </main>
  );
}
