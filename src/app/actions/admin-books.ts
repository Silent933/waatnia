"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { bookSlug, normalizeForSearch, smartTitle } from "@/lib/format";
import { requirePrisma } from "@/lib/prisma";
import { revalidateBooks, revalidateHome, revalidateStore } from "@/lib/revalidate";

export type AdminFormState = { status: "idle" | "error"; message?: string; fieldErrors?: Record<string, string> };

const bookSchema = z.object({
  sourceId: z.coerce.number().int().min(1).max(100000),
  titleAr: z.string().trim().min(1, "required").max(300),
  titleEn: z.string().trim().min(1, "required").max(300),
  descAr: z.string().trim().min(1, "required").max(8000),
  descEn: z.string().trim().min(1, "required").max(8000),
  author: z.string().trim().max(160).optional(),
  authorAr: z.string().trim().max(160).optional(),
  cover: z.string().trim().min(1, "required").max(500),
  priceSar: z.coerce.number().min(0).max(100000),
  stock: z.coerce.number().int().min(0).max(1000000),
  isCd: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  categoryId: z.coerce.number().int().min(1).optional(),
});

function searchTextFor(data: { titleAr: string; titleEn: string; descAr: string; descEn: string }) {
  return normalizeForSearch(`${data.titleAr} ${data.titleEn} ${data.descAr} ${data.descEn}`);
}

export async function saveBook(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const parsed = bookSchema.safeParse({
    sourceId: formData.get("sourceId"),
    titleAr: formData.get("titleAr"),
    titleEn: formData.get("titleEn"),
    descAr: formData.get("descAr"),
    descEn: formData.get("descEn"),
    author: formData.get("author") ?? "",
    authorAr: formData.get("authorAr") ?? "",
    cover: formData.get("cover"),
    priceSar: formData.get("priceSar"),
    stock: formData.get("stock"),
    isCd: formData.get("isCd") === "on",
    active: formData.get("active") === "on",
    categoryId: formData.get("categoryId") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors, message: "invalid" };
  }

  const v = parsed.data;
  const id = Number(formData.get("id") || 0) || null;
  const data = {
    sourceId: v.sourceId,
    titleAr: v.titleAr,
    titleEn: smartTitle(v.titleEn),
    descAr: v.descAr,
    descEn: v.descEn,
    author: v.author || null,
    authorAr: v.authorAr || null,
    cover: v.cover,
    priceCents: Math.round(v.priceSar * 100),
    stock: v.stock,
    isCd: v.isCd,
    active: v.active,
    categoryId: v.categoryId ?? null,
    searchText: searchTextFor(v),
  };

  // Collect the slugs that changed: the slug is derived from the title, so a
  // rename produces a *new* URL and the old one must be revalidated too or it
  // keeps serving the pre-edit page from cache.
  const affectedSlugs = [bookSlug(v.titleEn, v.sourceId)];

  try {
    if (id) {
      const existing = await prisma.book.findUnique({ where: { id } });
      if (!existing) return { status: "error", message: "not_found" };
      if (existing.slug !== affectedSlugs[0]) affectedSlugs.push(existing.slug);
      await prisma.book.update({
        where: { id },
        data: { ...data, slug: affectedSlugs[0] },
      });
      await logActivity({
        actor: admin.email,
        action: "book.updated",
        entity: "book",
        entityId: String(id),
        summary: `${v.titleEn} (#${v.sourceId})`,
      });
    } else {
      await prisma.book.create({ data: { ...data, slug: affectedSlugs[0] } });
      await logActivity({
        actor: admin.email,
        action: "book.created",
        entity: "book",
        summary: `${v.titleEn} (#${v.sourceId})`,
      });
    }
  } catch (error) {
    console.error("saveBook failed:", error);
    return { status: "error", message: "conflict" };
  }

  revalidatePath("/admin/books");
  revalidateBooks(affectedSlugs);
  revalidateHome();
  // The header nav and /categories read listCategories(), so a book that
  // changed category or was archived changes those counts too.
  revalidateStore();
  redirect("/admin/books?saved=1");
}

/** Soft delete: order history references these rows, so they are never dropped. */
export async function archiveBook(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();
  const id = Number(formData.get("id"));
  if (!id) return;

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return;
  await prisma.book.update({ where: { id }, data: { active: false } });
  await logActivity({
    actor: admin.email,
    action: "book.archived",
    entity: "book",
    entityId: String(id),
    summary: book.titleEn,
  });

  revalidatePath("/admin/books");
  revalidateBooks([book.slug]);
  revalidateStore();
  redirect("/admin/books?archived=1");
}

export async function restoreBook(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();
  const id = Number(formData.get("id"));
  if (!id) return;

  const book = await prisma.book.update({ where: { id }, data: { active: true } });
  await logActivity({
    actor: admin.email,
    action: "book.restored",
    entity: "book",
    entityId: String(id),
    summary: book.titleEn,
  });

  revalidatePath("/admin/books");
  revalidateBooks([book.slug]);
  redirect("/admin/books?restored=1");
}

export async function adjustStock(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();
  const id = Number(formData.get("id"));
  const rawDelta = Number(formData.get("delta"));
  // Reject fractional deltas: `stock` is an Int column, so 1.5 would either
  // error out of Prisma or, worse, be silently coerced.
  if (!id || !Number.isFinite(rawDelta) || rawDelta === 0) return;
  const delta = Math.trunc(rawDelta);
  if (delta === 0) return;

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return;

  // Apply the delta in the database instead of writing an absolute value.
  // A read-modify-write here races with a customer's own decrement in
  // placeOrder and would silently discard it.
  const updated = await prisma.book.updateMany({
    where: { id, stock: { gte: -delta } },
    data: { stock: { increment: delta } },
  });
  if (updated.count !== 1) redirect("/admin/books?error=stock");

  const next = Math.max(0, book.stock + delta);
  await logActivity({
    actor: admin.email,
    action: "book.stock",
    entity: "book",
    entityId: String(id),
    summary: `${book.titleEn}: ${book.stock} → ${next} (${delta > 0 ? "+" : ""}${delta})`,
  });

  revalidatePath("/admin/books");
  revalidateBooks([book.slug]);
  revalidateHome();
  revalidateStore();
  redirect("/admin/books");
}
