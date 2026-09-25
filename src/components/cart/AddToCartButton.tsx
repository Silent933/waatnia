"use client";

import { useEffect, useRef, useState } from "react";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { addLine } from "@/lib/cart-store";
import type { BookView, Locale } from "@/lib/types";

export function AddToCartButton({ book, lang }: { book: BookView; lang: Locale }) {
  const d = getDictionary(lang);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const disabled = book.stock <= 0;

  function handle() {
    if (disabled) return;
    addLine({
      bookId: book.id,
      slug: book.slug,
      titleAr: book.titleAr,
      titleEn: book.titleEn,
      cover: book.cover,
      priceCents: book.priceCents,
      stock: book.stock,
    });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2200);
  }

  return (
    <button type="button" onClick={handle} disabled={disabled} className="btn btn-primary w-full sm:w-auto">
      {disabled ? d.book.outOfStock : added ? `✓ ${d.book.added}` : d.book.addToCart}
    </button>
  );
}
