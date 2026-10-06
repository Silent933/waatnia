import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { listActivity } from "@/lib/activity";
import { formatDateTime } from "@/lib/format";
import { requirePrisma } from "@/lib/prisma";
import { money } from "@/components/admin/money";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكّد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export default async function AdminDashboard() {
  await requireAdmin();
  const prisma = requirePrisma();

  const [byStatus, revenue, bookCount, lowStock, unread, recentOrders, activity] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: { not: "cancelled" } }, _sum: { totalCents: true } }),
    prisma.book.count({ where: { active: true } }),
    prisma.book.findMany({
      where: { active: true, stock: { lte: 5 } },
      orderBy: { stock: "asc" },
      take: 8,
      select: { id: true, titleEn: true, titleAr: true, stock: true, cover: true },
    }),
    prisma.message.count({ where: { isRead: false } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    listActivity(8),
  ]);

  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])) as Partial<
    Record<OrderStatus, number>
  >;

  const stats = [
    { label: "طلبات جديدة", value: counts.new ?? 0, href: "/admin/orders?status=new" },
    { label: "قيد التجهيز", value: (counts.confirmed ?? 0) + (counts.shipped ?? 0), href: "/admin/orders" },
    { label: "تم التسليم", value: counts.delivered ?? 0, href: "/admin/orders?status=delivered" },
    { label: "إجمالي المبيعات", value: money(revenue._sum.totalCents ?? 0), href: "/admin/orders" },
    { label: "الكتب النشطة", value: bookCount, href: "/admin/books" },
    { label: "رسائل غير مقروءة", value: unread, href: "/admin/messages" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">نظرة عامة</h1>
        <p className="mt-1 text-sm text-muted">ملخّص الحالة الحالية للمتجر.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
            <p className="text-xs font-semibold text-muted">{s.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-accent">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-bold">أحدث الطلبات</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-accent">
              عرض الكل
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">لا توجد طلبات بعد.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-sunken">
                    <span className="min-w-0">
                      <span className="latin block truncate text-sm font-semibold" dir="ltr">
                        {o.number}
                      </span>
                      <span className="block truncate text-xs text-muted">{o.customerName}</span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className={`badge ${o.status === "new" ? "badge-accent" : o.status === "cancelled" ? "badge-danger" : o.status === "delivered" ? "badge-ok" : "badge-warn"}`}>
                        {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                      </span>
                      <span className="mt-1 block text-xs font-semibold">{money(o.totalCents)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-bold">مخزون منخفض</h2>
              <Link href="/admin/books" className="text-xs font-semibold text-accent">
                إدارة
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">كل الكتب متوفرة.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/books/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-sunken">
                      <span className="latin min-w-0 truncate text-sm font-semibold">{b.titleEn}</span>
                      <span className={`badge shrink-0 ${b.stock === 0 ? "badge-danger" : "badge-warn"}`}>{b.stock}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-bold">سجل النشاط</h2>
              <Link href="/admin/activity" className="text-xs font-semibold text-accent">
                عرض الكل
              </Link>
            </div>
            {activity.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">لا يوجد نشاط مسجّل.</p>
            ) : (
              <ul className="divide-y divide-line">
                {activity.map((a) => (
                  <li key={a.id} className="px-4 py-2.5">
                    <p className="truncate text-sm">{a.summary}</p>
                    <p className="text-[11px] text-muted">
                      {a.action} ·{" "}
                      {formatDateTime(a.createdAt, "short")}

                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="text-xs text-muted">
        الحالات: {ORDER_STATUSES.map((s) => STATUS_LABEL[s]).join(" ← ")}
      </p>
    </div>
  );
}
