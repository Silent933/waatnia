"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";
import { revalidateBooks, revalidateHome, revalidateStore } from "@/lib/revalidate";
import { slugify } from "@/lib/format";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveCategory(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const id = Number(formData.get("id") || 0) || null;
  const nameAr = str(formData, "nameAr");
  const nameEn = str(formData, "nameEn");
  const slug = slugify(str(formData, "slug") || nameEn);
  const sortRaw = Number(str(formData, "sort") || 0);
  // A non-numeric `sort` becomes NaN, which Prisma rejects with a confusing
  // error that the catch below would mislabel as a duplicate slug.
  const sort = Number.isFinite(sortRaw) ? Math.trunc(sortRaw) : 0;

  if (!nameAr || !nameEn || !slug) redirect("/admin/categories?error=invalid");

  try {
    if (id) {
      await prisma.category.update({ where: { id }, data: { nameAr, nameEn, slug, sort } });
      await logActivity({ actor: admin.email, action: "category.updated", entity: "category", entityId: String(id), summary: nameEn });
    } else {
      await prisma.category.create({ data: { nameAr, nameEn, slug, sort } });
      await logActivity({ actor: admin.email, action: "category.created", entity: "category", summary: nameEn });
    }
  } catch (error) {
    console.error("saveCategory failed:", error);
    // Only a unique-slug clash is the owner's mistake; anything else is ours.
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    redirect(`/admin/categories?error=${code === "P2002" ? "duplicate" : "server"}`);
  }

  revalidatePath("/admin/categories");
  // The header nav, the home page and /categories all read listCategories(),
  // and books filter by category slug — so a rename or delete is visible
  // across the whole storefront.
  revalidateStore();
  revalidateBooks();
  revalidateHome();
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const id = Number(formData.get("id"));
  if (!id) return;

  // Books keep their data; categoryId is set to NULL by the schema.
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return;
  await prisma.category.delete({ where: { id } });
  await logActivity({
    actor: admin.email,
    action: "category.deleted",
    entity: "category",
    entityId: String(id),
    summary: category.nameEn,
  });

  revalidatePath("/admin/categories");
  revalidateStore();
  revalidateBooks();
  revalidateHome();
  redirect("/admin/categories?deleted=1");
}
