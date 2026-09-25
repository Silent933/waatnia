import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";
import { listCategories } from "@/lib/repo";
import { BookForm, type BookFormValues } from "../BookForm";

export default async function AdminBookEditPage({ params }: PageProps<"/admin/books/[id]">) {
  await requireAdmin();
  const prisma = requirePrisma();

  const { id } = await params;
  const categories = await listCategories();

  if (id === "new") {
    const empty: BookFormValues = {
      sourceId: 113,
      titleEn: "",
      titleAr: "",
      author: "",
      authorAr: "",
      cover: "/covers/",
      categoryId: categories[0]?.id ?? null,
      priceSar: 30,
      stock: 0,
      isCd: false,
      active: true,
      descEn: "",
      descAr: "",
    };
    return (
      <div className="space-y-6">
        <header>
          <Link href="/admin/books" className="text-sm text-muted hover:text-accent">← الكتب</Link>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">إضافة كتاب</h1>
        </header>
        <BookForm values={empty} categories={categories} />
      </div>
    );
  }

  const bookId = Number(id);
  if (!Number.isInteger(bookId)) notFound();

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) notFound();

  const values: BookFormValues = {
    id: book.id,
    sourceId: book.sourceId,
    titleEn: book.titleEn,
    titleAr: book.titleAr,
    author: book.author ?? "",
    authorAr: book.authorAr ?? "",
    cover: book.cover,
    categoryId: book.categoryId,
    priceSar: book.priceCents / 100,
    stock: book.stock,
    isCd: book.isCd,
    active: book.active,
    descEn: book.descEn,
    descAr: book.descAr,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/books" className="text-sm text-muted hover:text-accent">← الكتب</Link>
          <h1 className="latin mt-1 text-2xl font-bold sm:text-3xl" dir="ltr">{book.titleEn}</h1>
        </div>
        <Link href={`/ar/books/${book.slug}`} className="btn btn-outline">
          عرض في المتجر
        </Link>
      </header>

      <BookForm values={values} categories={categories} />
    </div>
  );
}
