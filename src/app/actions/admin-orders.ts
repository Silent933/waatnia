"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";
import { isOrderStatus } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  confirmed: "مؤكّد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export async function updateOrderStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!id || !isOrderStatus(status)) return;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return;

  // Cancelling gives the reserved copies back; un-cancelling takes them out
  // again. Both directions are conditional so a status change that does not
  // actually move the order cannot double-count the stock.
  const wasCancelled = order.status === "cancelled";
  const isCancelled = status === "cancelled";

  if (wasCancelled !== isCancelled) {
    try {
      await prisma.$transaction(async (tx) => {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of items) {
          if (!item.bookId) continue;
          if (isCancelled) {
            await tx.book.updateMany({
              where: { id: item.bookId },
              data: { stock: { increment: item.quantity } },
            });
          } else {
            const updated = await tx.book.updateMany({
              where: { id: item.bookId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updated.count !== 1) throw new Error(`OUT_OF_STOCK:${item.bookId}`);
          }
        }
        await tx.order.update({ where: { id }, data: { status } });
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code.startsWith("OUT_OF_STOCK")) {
        revalidatePath(`/admin/orders/${id}`);
        redirect(`/admin/orders/${id}?error=stock`);
      }
      throw error;
    }
  } else {
    await prisma.order.update({ where: { id }, data: { status } });
  }

  await logActivity({
    actor: admin.email,
    action: "order.status",
    entity: "order",
    entityId: order.number,
    summary: `${order.number}: ${STATUS_LABELS[order.status] ?? order.status} → ${STATUS_LABELS[status] ?? status}`,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?updated=1`);
}

export async function deleteOrder(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const prisma = requirePrisma();

  const id = Number(formData.get("id"));
  if (!id) return;

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return;

  // Put the stock back before removing the order. A cancelled order already
  // returned its copies, so deleting it must not increment a second time.
  if (order.status !== "cancelled") {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.bookId) {
          await tx.book.updateMany({
            where: { id: item.bookId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.delete({ where: { id } });
    });
  } else {
    await prisma.order.delete({ where: { id } });
  }

  await logActivity({
    actor: admin.email,
    action: "order.deleted",
    entity: "order",
    entityId: order.number,
    summary: `${order.number} · ${order.customerName}`,
  });

  revalidatePath("/admin/orders");
  redirect("/admin/orders?deleted=1");
}
