import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCard } from "@/components/store/BookCard";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCatalogStats, listBooks, listCategories } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { isLocale } from "@/lib/types";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);
  const h = `/${lang}`;

  const [settings, stats, featured, categories] = await Promise.all([
    getSettings(),
    getCatalogStats(),
    listBooks({ take: 12 }),
    listCategories(),
  ]);

  const heroCovers = [
    { tilt: "lg:-rotate-3 lg:translate-y-4", duration: "7.5s", delay: "0s" },
    { tilt: "lg:rotate-2 lg:-translate-y-4", duration: "8.5s", delay: "-2.4s" },
    { tilt: "lg:rotate-3 lg:translate-y-8", duration: "9.5s", delay: "-4.2s" },
    { tilt: "lg:-rotate-2 lg:translate-y-2", duration: "8s", delay: "-1.2s" },
  ];

  const perks = [
    {
      title: lang === "ar" ? "توصيل لكل سوريا" : "Delivery across Syria",
      body:
        lang === "ar"
          ? "شحن إلى كل المحافظات، ومجاناً داخل الرياض."
          : "Shipping to every governorate, free inside Riyadh.",
    },
    {
      title: d.checkout.paymentCod,
      body:
        lang === "ar"
          ? "ادفع عند الاستلام دون أي رسوم مقدّمة."
          : "Pay the courier on arrival, no upfront payment.",
    },
    {
      title: lang === "ar" ? "عربي وإنجليزي" : "Arabic & English",
      body:
        lang === "ar"
          ? "فهرسة وبحث بلغتين معاً."
          : "Catalogue and search in both languages.",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-full bg-accent-soft/60 blur-3xl" />
        <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[1.1fr_auto] lg:items-center lg:py-20">
          <div>
            <span className="badge badge-accent">{d.hero.eyebrow}</span>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              {d.hero.title}
            </h1>
            <p className="prose-ar mt-5 max-w-xl text-ink-soft">{d.hero.subtitle}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`${h}/books`} className="btn btn-primary">
                {d.hero.cta}
              </Link>
              <Link href={`${h}/contact`} className="btn btn-outline">
                {d.hero.ctaSecondary}
              </Link>
            </div>

            <dl className="mt-9 flex flex-wrap gap-x-9 gap-y-4">
              {[
                { n: stats.books, l: d.hero.statBooks },
                { n: stats.categories, l: d.hero.statCats },
                { n: stats.stock, l: d.hero.statDelivery },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="text-3xl font-bold text-accent">{s.n.toLocaleString("en-US")}</dd>
                  <p className="mt-0.5 text-xs font-semibold text-muted">{s.l}</p>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-xs sm:max-w-sm lg:w-[26rem] lg:max-w-none">
            <div className="pointer-events-none absolute -inset-12 rounded-full bg-accent-soft/50 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4 sm:gap-5">
              {featured.slice(0, 4).map((b, i) => (
                <div key={b.id} className={heroCovers[i].tilt}>
                  <Link
                    href={`${h}/books/${b.slug}`}
                    className="group card block overflow-hidden shadow-lift animate-float"
                    style={{
                      animationDuration: heroCovers[i].duration,
                      animationDelay: heroCovers[i].delay,
                    }}
                  >
                    <div className="relative aspect-square bg-sunken">
                      <Image
                        src={b.cover}
                        alt={b.titleEn}
                        fill
                        priority={i < 4}
                        sizes="(min-width:1024px) 200px, (min-width:640px) 34vw, 42vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl">{d.books.title}</h2>
            <p className="mt-1.5 text-sm text-muted">{d.books.subtitle}</p>
          </div>
          <Link href={`${h}/books`} className="btn btn-outline btn-sm">
            {d.books.all}
          </Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {featured.map((b, i) => (
            <BookCard key={b.id} book={b} lang={lang} priority={i < 6} />
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className="container-page py-14">
            <h2 className="text-2xl sm:text-3xl">{d.nav.categories}</h2>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`${h}/books?category=${c.slug}`}
                  className="card flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span>{lang === "ar" ? c.nameAr : c.nameEn}</span>
                  {typeof c.count === "number" && (
                    <span className="badge badge-muted">{c.count}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-page py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {perks.map((p) => (
            <div key={p.title} className="card p-6">
              <h3 className="text-lg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="card flex flex-wrap items-center justify-between gap-5 bg-accent-soft/60 p-8">
          <div>
            <h2 className="text-2xl">{d.contact.title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{d.contact.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`${h}/contact`} className="btn btn-primary">
              {d.contact.send}
            </Link>
            {settings.contactWhatsapp && (
              <a
                href={`https://wa.me/${settings.contactWhatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
