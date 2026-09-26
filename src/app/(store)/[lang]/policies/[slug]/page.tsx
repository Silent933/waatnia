import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/types";

const SLUGS = ["shipping", "returns", "privacy", "terms"] as const;
type PolicySlug = (typeof SLUGS)[number];

function isPolicySlug(v: string): v is PolicySlug {
  return (SLUGS as readonly string[]).includes(v);
}

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => SLUGS.map((slug) => ({ lang, slug })));
}

// The slug list above is the whole set, so an unknown one is answered by the
// router with a real 404 status, which serves the branded `global-not-found`
// page. `notFound()` cannot be used here: with the root layout under the `[lang]`
// segment it escapes every not-found boundary and lands on a blank document.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/policies/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const d = getDictionary(isLocale(lang) ? lang : DEFAULT_LOCALE);
  if (!isLocale(lang) || !isPolicySlug(slug)) {
    return { title: d.notFound.title, robots: { index: false, follow: false } };
  }
  return { title: d.policies[slug] };
}

export default async function PolicyPage({ params }: PageProps<"/[lang]/policies/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !isPolicySlug(slug)) notFound();

  const d = getDictionary(lang);

  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl sm:text-4xl">{d.policies[slug]}</h1>
      <div className="card mt-6 p-6">
        <p className="text-ink-soft">{d.policies.body}</p>
      </div>
    </div>
  );
}
