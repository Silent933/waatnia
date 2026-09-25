import Image from "next/image";
import Link from "next/link";

import { logout } from "@/app/actions/admin-auth";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NAV = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/books", label: "الكتب" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/messages", label: "الرسائل" },
  { href: "/admin/activity", label: "سجل النشاط" },
  { href: "/admin/settings", label: "الإعدادات" },
];

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const [newOrders, unread] = prisma
    ? await Promise.all([
        prisma.order.count({ where: { status: "new" } }),
        prisma.message.count({ where: { isRead: false } }),
      ])
    : [0, 0];

  const badgeFor = (href: string) => {
    if (href === "/admin/orders" && newOrders > 0) return newOrders;
    if (href === "/admin/messages" && unread > 0) return unread;
    return null;
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface lg:h-dvh lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4 lg:justify-start">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/logo.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-1 ring-line" />
            <span className="font-bold">لوحة التحكم</span>
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => {
            const count = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-sunken hover:text-ink"
              >
                {item.label}
                {count !== null && (
                  <span className="ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3 lg:mt-auto">
          <p className="mb-2 truncate px-3 text-xs text-muted" dir="ltr">
            {admin.email}
          </p>
          <div className="flex gap-1">
            <Link href="/ar" className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold text-muted transition hover:bg-sunken">
              عرض المتجر
            </Link>
            <form action={logout}>
              <button type="submit" className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger-soft">
                خروج
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
