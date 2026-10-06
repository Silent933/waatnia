import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrackOrderForm } from "@/components/store/TrackOrderForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/order">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: getDictionary(lang).checkout.track,
    // A utility form with no content of its own — keep it out of the index but
    // let crawlers follow the link, since customers reach it from the footer.
    robots: { index: false, follow: true },
  };
}

export default async function TrackOrderPage({ params }: PageProps<"/[lang]/order">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl sm:text-4xl">{d.checkout.track}</h1>
        <p className="mt-2 text-ink-soft">{d.checkout.trackHint}</p>
        <TrackOrderForm lang={lang} />
        <p className="mt-6 text-xs text-muted">{d.status.hint}</p>
      </div>
    </div>
  );
}
