import type { Metadata } from "next";

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
  // The body is a placeholder until the policies are editable from /admin, so
  // these pages are kept out of the index: four near-identical stub pages are
  // thin content, and they are the kind of thing that drags a domain's
  // quality down. Flip this to index once real text is in place.
  return { title: d.policies[slug], robots: { index: false, follow: true } };
}

export default async function PolicyPage({ params }: PageProps<"/[lang]/policies/[slug]">) {
  const { lang, slug } = await params;
  // `dynamicParams = false` plus the fixed SLUGS list means the router only ever
  // renders valid pairs, so no re-check is needed — and calling notFound()
  // here would escape every boundary and serve a blank document.
  const d = getDictionary(isLocale(lang) ? lang : DEFAULT_LOCALE);
  const policySlug = isPolicySlug(slug) ? slug : "terms";

  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl sm:text-4xl">{d.policies[policySlug]}</h1>
      <div className="card mt-6 p-6">
        <p className="text-ink-soft">{d.policies.body}</p>
      </div>
    </div>
  );
}
