import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CartView } from "@/components/cart/CartView";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).cart.title, robots: { index: false, follow: true } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl sm:text-4xl">{d.cart.title}</h1>
      <div className="mt-8">
        <CartView lang={lang} />
      </div>
    </div>
  );
}
