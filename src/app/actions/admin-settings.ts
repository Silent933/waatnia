"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";
import { revalidateStore } from "@/lib/revalidate";
import { updateSettings } from "@/lib/settings";
import { CURRENCIES } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function nullable(v: string): string | null {
  return v.length > 0 ? v : null;
}

/** Comma- or newline-separated free-shipping zones. */
function list(v: string): string[] {
  return v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveSettings(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const currency = str(formData, "currencyDefault");
  const usdPerSar = Number(str(formData, "usdPerSar"));
  const sypPerSar = Number(str(formData, "sypPerSar"));
  const defaultPriceSar = Number(str(formData, "defaultPriceSar"));
  const shippingFlatSar = Number(str(formData, "shippingFlatSar"));

  if (!Number.isFinite(usdPerSar) || usdPerSar <= 0) redirect("/admin/settings?error=rates");
  if (!Number.isFinite(sypPerSar) || sypPerSar <= 0) redirect("/admin/settings?error=rates");
  if (!Number.isFinite(defaultPriceSar) || defaultPriceSar < 0) redirect("/admin/settings?error=price");
  if (!Number.isFinite(shippingFlatSar) || shippingFlatSar < 0) redirect("/admin/settings?error=shipping");
  if (!(CURRENCIES as readonly string[]).includes(currency)) redirect("/admin/settings?error=currency");

  await updateSettings({
    usdPerSar,
    sypPerSar,
    defaultPriceCents: Math.round(defaultPriceSar * 100),
    currencyDefault: currency,
    shippingFlatCents: Math.round(shippingFlatSar * 100),
    freeCountries: list(str(formData, "freeCountries")).map((c) => c.toUpperCase()),
    freeCities: list(str(formData, "freeCities")),
    storeNameAr: str(formData, "storeNameAr") || "قصصنا",
    storeNameEn: str(formData, "storeNameEn") || "Waatnia Stories",
    taglineAr: str(formData, "taglineAr"),
    taglineEn: str(formData, "taglineEn"),
    contactPhone: nullable(str(formData, "contactPhone")),
    contactWhatsapp: nullable(str(formData, "contactWhatsapp")),
    contactEmail: nullable(str(formData, "contactEmail")),
    contactAddressAr: nullable(str(formData, "contactAddressAr")),
    contactAddressEn: nullable(str(formData, "contactAddressEn")),
    bankName: nullable(str(formData, "bankName")),
    bankAccountName: nullable(str(formData, "bankAccountName")),
    bankIban: nullable(str(formData, "bankIban")),
    instagramUrl: nullable(str(formData, "instagramUrl")),
    facebookUrl: nullable(str(formData, "facebookUrl")),
    telegramUrl: nullable(str(formData, "telegramUrl")),
    siteUrl: nullable(str(formData, "siteUrl")),
    seoTitleAr: nullable(str(formData, "seoTitleAr")),
    seoTitleEn: nullable(str(formData, "seoTitleEn")),
    seoDescAr: nullable(str(formData, "seoDescAr")),
    seoDescEn: nullable(str(formData, "seoDescEn")),
  });

  await logActivity({ actor: admin.email, action: "settings.updated", entity: "setting", entityId: "1", summary: "تم تحديث الإعدادات" });

  revalidatePath("/admin/settings");
  // Settings feed the header, footer, prices and shipping on every page.
  revalidateStore();
  redirect("/admin/settings?saved=1");
}

export async function toggleMessageRead(formData: FormData): Promise<void> {
  await requireAdmin();
  const prisma = requirePrisma();

  const id = Number(formData.get("id"));
  if (!id) return;

  const current = await prisma.message.findUnique({ where: { id } });
  if (!current) return;

  await prisma.message.update({ where: { id }, data: { isRead: !current.isRead } });

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function deleteMessage(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const id = Number(formData.get("id"));
  if (!id) return;

  const message = await prisma.message.findUnique({ where: { id } });
  await prisma.message.delete({ where: { id } });
  await logActivity({
    actor: admin.email,
    action: "message.deleted",
    entity: "message",
    entityId: String(id),
    summary: message?.name ?? `#${id}`,
  });

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function changeAdminPassword(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const schema = z
    .object({ next: z.string().min(8, "weak"), confirm: z.string() })
    .refine((v) => v.next === v.confirm, { message: "mismatch" });
  if (!schema.safeParse({ next, confirm }).success) redirect("/admin/settings?error=password");

  const record = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!record) redirect("/admin/settings?error=password");

  const bcrypt = (await import("bcryptjs")).default;
  if (!(await bcrypt.compare(current, record.passwordHash))) redirect("/admin/settings?error=current");

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  await logActivity({ actor: admin.email, action: "auth.password", entity: "admin", entityId: String(admin.id), summary: "تم تغيير كلمة المرور" });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?password=1");
}
