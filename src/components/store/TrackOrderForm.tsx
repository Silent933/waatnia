"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";

export function TrackOrderForm({ lang, initial = "" }: { lang: Locale; initial?: string }) {
  const d = getDictionary(lang);
  const router = useRouter();
  const [value, setValue] = useState(initial);

  return (
    <form
      className="mt-6 flex flex-wrap gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const number = value.trim().toUpperCase();
        if (number) router.push(`/${lang}/order/${encodeURIComponent(number)}`);
      }}
    >
      <label className="sr-only" htmlFor="order-number">
        {d.checkout.orderNumber}
      </label>
      <input
        id="order-number"
        className="field latin h-12 min-w-56 flex-1 uppercase"
        placeholder={d.checkout.trackPlaceholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        dir="ltr"
      />
      <button type="submit" className="btn btn-primary h-12">
        {d.checkout.trackButton}
      </button>
    </form>
  );
}
