"use client";

import { cartStore } from "@/lib/cart-store";

/**
 * Warms the localStorage-backed cart on mount so the first interaction does not
 * have to pay for the parse. Renders nothing.
 */
export function CartHydration() {
  if (typeof window !== "undefined") {
    // getSnapshot() is the documented lazy-load entry point.
    cartStore.getSnapshot();
  }
  return null;
}
