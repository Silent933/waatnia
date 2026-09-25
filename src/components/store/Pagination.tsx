import Link from "next/link";

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";

export function Pagination({
  lang,
  page,
  totalPages,
  basePath,
  query,
}: {
  lang: Locale;
  page: number;
  totalPages: number;
  basePath: string;
  query: Record<string, string>;
}) {
  const d = getDictionary(lang);
  if (totalPages <= 1) return null;

  function href(p: number) {
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const window = 2;
  const numbers: number[] = [];
  for (let p = Math.max(1, page - window); p <= Math.min(totalPages, page + window); p++) {
    numbers.push(p);
  }

  const item =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition";

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${item} border-line-strong text-ink-soft hover:bg-sunken`}>
          ‹
        </Link>
      )}
      {numbers[0] > 1 && <span className="px-1 text-muted">…</span>}
      {numbers.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${item} ${
            p === page ? "border-accent bg-accent text-white" : "border-line-strong text-ink-soft hover:bg-sunken"
          }`}
        >
          {p}
        </Link>
      ))}
      {numbers[numbers.length - 1] < totalPages && <span className="px-1 text-muted">…</span>}
      {page < totalPages && (
        <Link href={href(page + 1)} rel="next" className={`${item} border-line-strong text-ink-soft hover:bg-sunken`}>
          ›
        </Link>
      )}
      <span className="sr-only">{d.common.loading}</span>
    </nav>
  );
}
