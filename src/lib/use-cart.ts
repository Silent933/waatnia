"use client";

import { useSyncExternalStore } from "react";

import {
  cartCount,
  cartStore,
  cartSubtotalCents,
  type CartLine,
} from "@/lib/cart-store";

export function useCart() {
  const lines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  return { lines, count: cartCount(lines), subtotalCents: cartSubtotalCents(lines) };
}

export type { CartLine };
