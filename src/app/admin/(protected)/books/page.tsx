import Image from "next/image";
import Link from "next/link";

import { archiveBook, adjustStock, restoreBook } from "@/app/actions/admin-books";
import { requireAdmin } from "@/lib/auth";
import { normalizeForSearch } from "@/lib/format";
import { requirePrisma } from "@/lib/prisma";
import { money } from "@/components/admin/money";

const PAGE_SIZE = 40;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AdminBooksPage({ searchParams }: PageProps<"/admin/books">) {
  await requireAdmin();
  const prisma = requirePrisma();

  const sp = await searchParams;
  const q = first(sp.q).trim();
  const view = first(sp.view) === "archived" ? "archived" : "active";
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const where = {
    ...(view === "archived" ? { active: false } : { active: true }),
    ...(q ? { searchText: { contains: normalizeForSearch(q) } } : {}),
  };

  const [total, books, categories] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      include: { category: true },
      orderBy: { sourceId: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (view === "archived") params.set("view", "archived");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/books${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">الكتب</h1>
          <p className="mt-1 text-sm text-muted">{total} كتاب</p>
        </div>
        <Link href="/admin/books/new" className="btn btn-primary">
          + إضافة كتاب
        </Link>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="ابحث بالعنوان أو الاسم العربي…"
          className="field h-10 min-w-56 flex-1"
        />
        {view === "archived" && <input type="hidden" name="view" value="archived" />}
        <button type="submit" className="btn btn-outline h-10">بحث</button>
        <Link href={view === "archived" ? "/admin/books?view=archived" : "/admin/books"} className={`btn h-10 ${view === "active" ? "btn-primary" : "btn-outline"}`}>
          النشطة
        </Link>
        <Link href={q ? `/admin/books?view=archived&q=${encodeURIComponent(q)}` : "/admin/books?view=archived"} className={`btn h-10 ${view === "archived" ? "btn-primary" : "btn-outline"}`}>
          المؤرشفة
        </Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-muted">
              <th className="p-3 text-start font-semibold">الغلاف</th>
              <th className="p-3 text-start font-semibold">العنوان</th>
              <th className="p-3 text-start font-semibold">التصنيف</th>
              <th className="p-3 text-start font-semibold">السعر</th>
              <th className="p-3 text-start font-semibold">المخزون</th>
              <th className="p-3 text-start font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {books.map((b) => (
              <tr key={b.id} className="transition hover:bg-sunken/60">
                <td className="p-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-sunken">
                    <Image src={b.cover} alt="" fill sizes="44px" className="object-cover" />
                  </div>
                </td>
                <td className="p-3">
                  <Link href={`/admin/books/${b.id}`} className="latin block font-semibold hover:text-accent" dir="ltr">
                    {b.titleEn}
                  </Link>
                  <span className="block text-xs text-muted">{b.titleAr}</span>
                  <span className="latin text-[11px] text-muted" dir="ltr">#{b.sourceId}</span>
                </td>
                <td className="p-3 text-muted">{b.category?.nameAr ?? "—"}</td>
                <td className="p-3 font-semibold">{money(b.priceCents)}</td>
                <td className="p-3">
                  <span className={`badge ${b.stock === 0 ? "badge-danger" : b.stock <= 5 ? "badge-warn" : "badge-ok"}`}>
                    {b.stock}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={adjustStock}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="delta" value={-1} />
                      <button type="submit" className="btn btn-outline btn-sm" aria-label="إنقاص">−</button>
                    </form>
                    <form action={adjustStock}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="delta" value={1} />
                      <button type="submit" className="btn btn-outline btn-sm" aria-label="زيادة">+</button>
                    </form>
                    <Link href={`/admin/books/${b.id}`} className="btn btn-outline btn-sm">تعديل</Link>
                    {b.active ? (
                      <form action={archiveBook}>
                        <input type="hidden" name="id" value={b.id} />
                        <button type="submit" className="btn btn-ghost btn-sm text-danger">أرشفة</button>
                      </form>
                    ) : (
                      <form action={restoreBook}>
                        <input type="hidden" name="id" value={b.id} />
                        <button type="submit" className="btn btn-ghost btn-sm text-ok">استعادة</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">لا توجد نتائج.</td>
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

      <p className="text-xs text-muted">
        التصنيفات: {categories.map((c) => c.nameAr).join("، ")}
      </p>
    </div>
  );
}
