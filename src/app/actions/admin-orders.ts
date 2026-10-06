"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/auth";
import { requirePrisma } from "@/lib/prisma";
import { revalidateHome, revalidateStore } from "@/lib/revalidate";
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

  // Re-read the order inside the transaction and commit the status change
  // with a compare-and-swap on the status we branched on. Reading the status
  // outside (as this used to) let two concurrent cancels both see "new", both
  // return the copies to stock, and then both write "cancelled" — inflating
  // inventory permanently. updateMany acts as the guard: the loser's WHERE
  // no longer matches, it throws, and the whole transaction rolls back.
  let previousStatus = "";
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new Error(`NOT_FOUND:${id}`);

      previousStatus = order.status;
      const wasCancelled = order.status === "cancelled";
      const isCancelled = status === "cancelled";

      if (wasCancelled !== isCancelled) {
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
      }

      const swapped = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status },
      });
      if (swapped.count !== 1) throw new Error(`CONFLICT:${id}`);
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("OUT_OF_STOCK")) {
      revalidatePath(`/admin/orders/${id}`);
      redirect(`/admin/orders/${id}?error=stock`);
    }
    if (code.startsWith("CONFLICT")) {
      revalidatePath(`/admin/orders/${id}`);
      redirect(`/admin/orders/${id}?error=conflict`);
    }
    if (code.startsWith("NOT_FOUND")) redirect(`/admin/orders/${id}?error=not_found`);
    throw error;
  }

  const order = await prisma.order.findUnique({ where: { id }, select: { number: true } });

  await logActivity({
    actor: admin.email,
    action: "order.status",
    entity: "order",
    entityId: order?.number ?? String(id),
    summary: `${order?.number ?? id}: ${STATUS_LABELS[previousStatus] ?? previousStatus} → ${STATUS_LABELS[status] ?? status}`,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  // Cancelling hands the reserved copies back, so availability on the
  // storefront changes too.
  revalidateHome();
  revalidateStore("books");
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
  // Deleting a live order returns its copies to stock.
  revalidateHome();
  revalidateStore("books");
  redirect("/admin/orders?deleted=1");
}
