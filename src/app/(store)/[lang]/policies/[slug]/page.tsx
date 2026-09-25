import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, LOCALES } from "@/lib/types";

const SLUGS = ["shipping", "returns", "privacy", "terms"] as const;
type PolicySlug = (typeof SLUGS)[number];

function isPolicySlug(v: string): v is PolicySlug {
  return (SLUGS as readonly string[]).includes(v);
}

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => SLUGS.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/policies/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !isPolicySlug(slug)) return {};
  return { title: getDictionary(lang).policies[slug] };
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
