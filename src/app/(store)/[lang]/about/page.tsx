import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCatalogStats } from "@/lib/repo";
import { isLocale } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).about.title, description: getDictionary(lang).about.body };
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);
  const { books, categories, stock } = await getCatalogStats();

  const points =
    lang === "ar"
      ? [
          "اخترنا كل كتاب بعناية من أدب عالمي وعربي.",
          "نوصل إلى جميع المحافظات السورية، وإلى الرياض مجاناً.",
          "أسعار واضحة بعملتك: دولار أو ريال أو ليرة سورية.",
          "ادفع عند الاستلام أو بتحويل بنكي، بلا رسوم خفية.",
        ]
      : [
          "Every title is hand-picked from world and Arabic literature.",
          "We deliver to every Syrian governorate, and free inside Riyadh.",
          "Clear prices in your currency: US Dollar, Saudi Riyal or Syrian Pound.",
          "Pay on delivery or by bank transfer, with no hidden fees.",
        ];

  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl sm:text-4xl">{d.about.title}</h1>
      <p className="prose-ar mt-5 text-lg text-ink-soft">{d.about.body}</p>

      <dl className="mt-8 grid grid-cols-3 gap-4">
        {[
          { n: books, l: d.hero.statBooks },
          { n: categories, l: d.hero.statCats },
          { n: stock, l: d.hero.statDelivery },
        ].map((s) => (
          <div key={s.l} className="card p-4 text-center">
            <dd className="text-2xl font-bold text-accent">{s.n.toLocaleString("en-US")}</dd>
            <dt className="mt-1 text-xs text-muted">{s.l}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-xl">{lang === "ar" ? "لماذا تختارنا" : "Why choose us"}</h2>
      <ul className="mt-4 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="prose-ar text-ink-soft">{p}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl">{d.contact.title}</h2>
      <p className="mt-3 text-ink-soft">{d.contact.subtitle}</p>
      <Link href={`/${lang}/contact`} className="btn btn-primary mt-5">
        {d.contact.send}
      </Link>
    </div>
  );
}
