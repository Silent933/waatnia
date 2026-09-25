import { deleteCategory, saveCategory } from "@/app/actions/admin-categories";
import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const prisma = requirePrisma();

  const sp = await searchParams;
  const message = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const categories = await prisma.category.findMany({
    orderBy: { sort: "asc" },
    include: { _count: { select: { books: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">التصنيفات</h1>
        <p className="mt-1 text-sm text-muted">{categories.length} تصنيف</p>
      </header>

      {message && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {message === "duplicate" ? "هذا المعرّف (slug) مستخدم بالفعل." : "البيانات غير مكتملة."}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="p-3 text-start font-semibold">العربية</th>
              <th className="p-3 text-start font-semibold">English</th>
              <th className="p-3 text-start font-semibold">slug</th>
              <th className="p-3 text-start font-semibold">الترتيب</th>
              <th className="p-3 text-start font-semibold">الكتب</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {categories.map((c) => (
              <tr key={c.id}>
                <td colSpan={4} className="p-3">
                  <form id={`cat-${c.id}`} action={saveCategory} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_5rem]">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="nameAr" defaultValue={c.nameAr} className="field h-9 text-sm" placeholder="العربية" required />
                    <input name="nameEn" defaultValue={c.nameEn} className="field latin h-9 text-sm" dir="ltr" placeholder="English" required />
                    <input name="slug" defaultValue={c.slug} className="field latin h-9 text-sm" dir="ltr" required />
                    <input name="sort" type="number" defaultValue={c.sort} className="field h-9 text-sm" dir="ltr" />
                  </form>
                </td>
                <td className="p-3 text-center">
                  <span className="badge badge-muted">{c._count.books}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button type="submit" form={`cat-${c.id}`} className="btn btn-outline btn-sm">حفظ</button>
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="btn btn-ghost btn-sm text-danger">حذف</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">احفظ كل صف بالضغط على «حفظ» بجواره.</p>

      <section className="card p-5">
        <h2 className="font-bold">إضافة تصنيف</h2>
        <form action={saveCategory} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_5rem_auto]">
          <input name="nameAr" className="field h-10" placeholder="العربية" required />
          <input name="nameEn" className="field latin h-10" dir="ltr" placeholder="English" required />
          <input name="slug" className="field latin h-10" dir="ltr" placeholder="slug" required />
          <input name="sort" type="number" defaultValue={0} className="field h-10" dir="ltr" />
          <button type="submit" className="btn btn-primary h-10">إضافة</button>
        </form>
        <p className="mt-2 text-xs text-muted">حذف التصنيف لا يحذف كتبه — تصبح بدون تصنيف.</p>
      </section>
    </div>
  );
}
