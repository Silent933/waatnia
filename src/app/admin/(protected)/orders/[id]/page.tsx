import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOrder, updateOrderStatus } from "@/app/actions/admin-orders";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/components/admin/money";
import { requirePrisma } from "@/lib/prisma";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكّد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "long",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(value);
}

export default async function AdminOrderDetailPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const prisma = requirePrisma();

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { book: { select: { slug: true, active: true } } } } },
  });
  if (!order) notFound();

  const sp = await searchParams;
  const notice = (Array.isArray(sp.error) ? sp.error[0] : sp.error) ?? null;

  const field = [
    { label: "الاسم", value: order.customerName },
    { label: "الهاتف", value: order.phone, ltr: true },
    { label: "الدولة", value: `${order.countryAr} (${order.country})`, ltr: true },
    { label: "المدينة", value: order.city },
    { label: "العنوان", value: order.address },
    { label: "طريقة الدفع", value: order.paymentMethod === "cod" ? "الدفع عند الاستلام" : "تحويل بنكي" },
    { label: "اللغة", value: order.locale === "ar" ? "العربية" : "English" },
    { label: "التاريخ", value: formatDate(order.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-muted hover:text-accent">← الطلبات</Link>
          <h1 className="latin mt-1 text-2xl font-bold sm:text-3xl" dir="ltr">{order.number}</h1>
        </div>
        <span className={`badge ${order.status === "new" ? "badge-accent" : order.status === "cancelled" ? "badge-danger" : order.status === "delivered" ? "badge-ok" : "badge-warn"}`}>
          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
        </span>
      </header>

      {notice === "stock" && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          تعذّر إلغاء الإلغاء: لا يوجد مخزون كافٍ لإعادة حجز الكميات. زد المخزون من صفحة الكتب أو أبقِ الطلب ملغياً.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 font-bold">الكتب</h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-sunken">
                    <Image src={item.cover} alt="" fill sizes="44px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.book ? (
                      <Link href={`/ar/books/${item.book.slug}`} className="latin block truncate text-sm font-semibold hover:text-accent" dir="ltr">
                        {item.titleEn}
                      </Link>
                    ) : (
                      <span className="latin block truncate text-sm font-semibold" dir="ltr">{item.titleEn}</span>
                    )}
                    <span className="block truncate text-xs text-muted">{item.titleAr}</span>
                  </div>
                  <span className="text-sm text-muted">× {item.quantity}</span>
                  <span className="w-20 text-end text-sm font-semibold">{money(item.unitPriceCents * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">المجموع الفرعي</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">التوصيل {order.freeShipping ? "(مجاني)" : ""}</dt>
                <dd>{order.shippingCents === 0 ? "مجاني" : money(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>الإجمالي</dt>
                <dd className="text-accent">{money(order.totalCents)}</dd>
              </div>
            </dl>
          </section>

          {order.note && (
            <section className="card p-4">
              <h2 className="font-bold">ملاحظات العميل</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{order.note}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-4">
            <h2 className="font-bold">تغيير الحالة</h2>
            <form action={updateOrderStatus} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={order.id} />
              {ORDER_STATUSES.map((s) => (
                <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  order.status === s ? "border-accent bg-accent-soft/50 font-semibold" : "border-line hover:bg-sunken"
                }`}>
                  <input type="radio" name="status" value={s} defaultChecked={order.status === s} className="accent-[#8a5a24]" />
                  {STATUS_LABEL[s]}
                </label>
              ))}
              <button type="submit" className="btn btn-primary w-full">حفظ الحالة</button>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="font-bold">بيانات العميل</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {field.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs text-muted">{f.label}</dt>
                  <dd className={f.ltr ? "latin font-semibold" : "font-semibold"} dir={f.ltr ? "ltr" : undefined}>
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="font-bold text-danger">منطقة الخطر</h2>
            <p className="mt-1.5 text-xs text-muted">
              حذف الطلب يعيد الكميات إلى المخزون (ما لم يكن ملغياً).
            </p>
            <form action={deleteOrder} className="mt-3">
              <input type="hidden" name="id" value={order.id} />
              <button type="submit" className="btn btn-danger w-full">حذف الطلب</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
