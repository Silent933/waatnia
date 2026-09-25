"use client";

/**
 * Cart state lives in localStorage so a guest can add books before ever
 * talking to the server. The order itself is only created on checkout, via a
 * Server Action that re-reads prices and stock from the database.
 */

export type CartLine = {
  bookId: number;
  slug: string;
  titleAr: string;
  titleEn: string;
  cover: string;
  priceCents: number;
  stock: number;
  qty: number;
};

const KEY = "waatnia.cart.v1";

let lines: CartLine[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) lines = parsed.filter(isLine);
    }
  } catch {
    lines = [];
  }
}

function isLine(v: unknown): v is CartLine {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.bookId === "number" &&
    typeof o.slug === "string" &&
    typeof o.titleEn === "string" &&
    typeof o.priceCents === "number" &&
    typeof o.qty === "number"
  );
}

function emit() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage full or blocked — cart still works for this session */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): CartLine[] {
  load();
  return lines;
}

/** Stable empty array for SSR so the first paint matches the server HTML. */
const EMPTY: CartLine[] = [];
function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

export const cartStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
};

export function addLine(input: Omit<CartLine, "qty">, qty = 1): void {
  load();
  const existing = lines.find((l) => l.bookId === input.bookId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, Math.max(1, existing.stock));
  } else {
    lines = [...lines, { ...input, qty: Math.min(qty, Math.max(1, input.stock)) }];
  }
  emit();
}

export function setQty(bookId: number, qty: number): void {
  load();
  lines = lines
    .map((l) => (l.bookId === bookId ? { ...l, qty: Math.max(1, Math.min(qty, l.stock)) } : l))
    .filter((l) => l.qty > 0);
  emit();
}

export function removeLine(bookId: number): void {
  load();
  lines = lines.filter((l) => l.bookId !== bookId);
  emit();
}

export function clearCart(): void {
  load();
  lines = [];
  emit();
}

export function cartCount(list: CartLine[]): number {
  return list.reduce((n, l) => n + l.qty, 0);
}

export function cartSubtotalCents(list: CartLine[]): number {
  return list.reduce((n, l) => n + l.priceCents * l.qty, 0);
}
