import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";
import { money } from "@/components/admin/money";
import { ORDER_STATUSES, isOrderStatus, type OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكّد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const PAGE_SIZE = 30;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(value);
}

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const prisma = requirePrisma();

  const sp = await searchParams;
  const statusParam = first(sp.status);
  const status = isOrderStatus(statusParam) ? statusParam : null;
  const q = first(sp.q).trim();
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { city: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, orders, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: { select: { quantity: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<
    Record<OrderStatus, number>
  >;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

  const itemCount = (o: (typeof orders)[number]) => o.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">الطلبات</h1>
        <p className="mt-1 text-sm text-muted">{total} طلب</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link href={q ? `/admin/orders?q=${encodeURIComponent(q)}` : "/admin/orders"} className={`btn btn-sm ${!status ? "btn-primary" : "btn-outline"}`}>
          الكل
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`btn btn-sm ${status === s ? "btn-primary" : "btn-outline"}`}
          >
            {STATUS_LABEL[s]}
            {byStatus[s] ? <span className="ms-1 opacity-70">{byStatus[s]}</span> : null}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input type="search" name="q" defaultValue={q} placeholder="رقم الطلب، الاسم، الهاتف، المدينة…" className="field h-10 min-w-56 flex-1" />
        <button type="submit" className="btn btn-outline h-10">بحث</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="p-3 text-start font-semibold">رقم الطلب</th>
              <th className="p-3 text-start font-semibold">العميل</th>
              <th className="p-3 text-start font-semibold">الموقع</th>
              <th className="p-3 text-start font-semibold">الكتب</th>
              <th className="p-3 text-start font-semibold">الإجمالي</th>
              <th className="p-3 text-start font-semibold">الحالة</th>
              <th className="p-3 text-start font-semibold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="transition hover:bg-sunken/60">
                <td className="p-3">
                  <Link href={`/admin/orders/${o.id}`} className="latin font-semibold hover:text-accent" dir="ltr">
                    {o.number}
                  </Link>
                </td>
                <td className="p-3">
                  <span className="block font-semibold">{o.customerName}</span>
                  <span className="latin block text-xs text-muted" dir="ltr">{o.phone}</span>
                </td>
                <td className="p-3 text-muted">{o.city}</td>
                <td className="p-3 text-muted">{itemCount(o)}</td>
                <td className="p-3 font-semibold">{money(o.totalCents)}</td>
                <td className="p-3">
                  <span className={`badge ${o.status === "new" ? "badge-accent" : o.status === "cancelled" ? "badge-danger" : o.status === "delivered" ? "badge-ok" : "badge-warn"}`}>
                    {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted">لا توجد طلبات.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageLink(p)}
              aria-current={p === page ? "page" : undefined}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold ${
                p === page ? "border-accent bg-accent text-white" : "border-line-strong text-ink-soft hover:bg-sunken"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
