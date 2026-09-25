import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/settings";
import { isLocale } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).checkout.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);
  const settings = await getSettings();

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{d.checkout.title}</h1>
        <p className="mt-2 text-ink-soft">{d.checkout.subtitle}</p>
      </header>
      <div className="mt-8">
        <CheckoutForm lang={lang} settings={settings} />
      </div>
    </div>
  );
}
