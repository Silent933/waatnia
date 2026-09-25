"use server";

import { randomBytes } from "node:crypto";

import { logActivity } from "@/lib/activity";
import { countryName, isKnownCountry } from "@/lib/countries";
import { requirePrisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";
import { revalidateHome, revalidateStore } from "@/lib/revalidate";
import { getSettings } from "@/lib/settings";
import { shippingCost } from "@/lib/shipping";
import { PAYMENT_METHODS, type Locale, type OrderStatus } from "@/lib/types";

export type OrderFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  orderNumber?: string;
  fieldErrors?: Record<string, string>;
};

const MAX_QTY = 20;

function field(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function makeOrderNumber(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  // The random part is the only secret guarding the guest tracker, which
  // exposes the customer's name and city. 5 bytes = 40 bits, so a day of
  // orders cannot be enumerated; the date prefix stays readable.
  return `WNT-${yy}${mm}${dd}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

/** Guest-visible order tracker: returns only non-sensitive fields. */
export async function getOrderForGuest(
  number: string,
): Promise<
  | {
      number: string;
      status: OrderStatus;
      customerName: string;
      city: string;
      countryAr: string;
      createdAt: string;
      items: { titleAr: string; titleEn: string; cover: string; quantity: number; unitPriceCents: number }[];
      subtotalCents: number;
      shippingCents: number;
      totalCents: number;
    }
  | null
> {
  const prisma = requirePrisma();
  const order = await prisma.order.findUnique({
    where: { number: field(number).toUpperCase() },
    include: { items: true },
  });
  if (!order) return null;
  return {
    number: order.number,
    status: order.status as OrderStatus,
    customerName: order.customerName,
    city: order.city,
    countryAr: order.countryAr,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      titleAr: i.titleAr,
      titleEn: i.titleEn,
      cover: i.cover,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
  };
}

/**
 * Places a guest order.
 *
 * The cart lives in the visitor's browser, so nothing in the submitted payload
 * is trusted: quantities are re-read against the database, prices come from the
 * book rows, and stock is decremented with a conditional update so two people
 * cannot buy the last copy at the same time.
 */
export async function placeOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const prisma = requirePrisma();

  const locale = (field(formData.get("locale")) || "ar") as Locale;
  const customerName = field(formData.get("name"));
  const phone = field(formData.get("phone"));
  const country = field(formData.get("country")).toUpperCase();
  const city = field(formData.get("city"));
  const address = field(formData.get("address"));
  const note = field(formData.get("note")) || null;
  const paymentMethod = field(formData.get("paymentMethod"));
  const rawItems = field(formData.get("items"));

  const fieldErrors: Record<string, string> = {};
  if (customerName.length < 2) fieldErrors.name = "required";
  if (phone.replace(/\D/g, "").length < 6) fieldErrors.phone = "required";
  if (!isKnownCountry(country)) fieldErrors.country = "required";
  if (city.length < 2) fieldErrors.city = "required";
  if (address.length < 5) fieldErrors.address = "required";
  if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) fieldErrors.paymentMethod = "required";
  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors };

  let requested: { bookId: number; qty: number }[];
  try {
    const parsed = JSON.parse(rawItems);
    if (!Array.isArray(parsed)) throw new Error("bad shape");
    requested = parsed
      .map((x) => ({ bookId: Number(x?.bookId), qty: Number(x?.qty) }))
      .filter((x) => Number.isInteger(x.bookId) && Number.isInteger(x.qty) && x.qty > 0)
      .map((x) => ({ ...x, qty: Math.min(x.qty, MAX_QTY) }));
  } catch {
    requested = [];
  }
  if (requested.length === 0) return { status: "error", message: "empty" };

  // Only fully valid submissions consume quota, so a customer who mistypes a
  // field is not punished; the cap then stops one address from draining stock
  // with a loop of otherwise-valid orders.
  const waitFor = await enforceRateLimit("order", await clientIp(), 5, 10 * 60_000);
  if (waitFor !== null) {
    return { status: "error", message: `طلبات كثيرة خلال وقت قصير. حاول بعد ${Math.max(1, Math.ceil(waitFor / 60))} دقيقة.` };
  }

  const settings = await getSettings();
  const ship = shippingCost(country, city, settings);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const ids = [...new Set(requested.map((r) => r.bookId))];
      const books = await tx.book.findMany({ where: { id: { in: ids }, active: true } });
      const byId = new Map(books.map((b) => [b.id, b]));

      for (const item of requested) {
        const book = byId.get(item.bookId);
        if (!book) throw new Error(`MISSING_BOOK:${item.bookId}`);
        if (book.stock < item.qty) throw new Error(`OUT_OF_STOCK:${item.bookId}`);

        // Conditional decrement: if another order took the copy first, count is 0
        // and the whole transaction rolls back.
        const updated = await tx.book.updateMany({
          where: { id: item.bookId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (updated.count !== 1) throw new Error(`OUT_OF_STOCK:${item.bookId}`);
      }

      const subtotalCents = requested.reduce((sum, item) => {
        const book = byId.get(item.bookId)!;
        return sum + book.priceCents * item.qty;
      }, 0);

      const number = makeOrderNumber();
      const created = await tx.order.create({
        data: {
          number,
          customerName,
          phone,
          country,
          countryAr: countryName(country, "ar"),
          city,
          address,
          note,
          paymentMethod,
          status: "new",
          subtotalCents,
          shippingCents: ship.costCents,
          totalCents: subtotalCents + ship.costCents,
          freeShipping: ship.free,
          locale,
          items: {
            create: requested.map((item) => {
              const book = byId.get(item.bookId)!;
              return {
                bookId: book.id,
                titleAr: book.titleAr,
                titleEn: book.titleEn,
                cover: book.cover,
                unitPriceCents: book.priceCents,
                quantity: item.qty,
              };
            }),
          },
        },
      });
      return created;
    });

    await logActivity({
      action: "order.created",
      entity: "order",
      entityId: order.number,
      summary: `${order.number} · ${order.customerName} · ${order.totalCents / 100} SAR`,
    });

    revalidateStore("books");
    revalidateHome();
    return { status: "success", orderNumber: order.number };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("OUT_OF_STOCK")) return { status: "error", message: "out_of_stock" };
    if (code.startsWith("MISSING_BOOK")) return { status: "error", message: "out_of_stock" };
    console.error("placeOrder failed:", error);
    return { status: "error", message: "unknown" };
  }
}
