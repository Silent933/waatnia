import Link from "next/link";

import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale, Settings } from "@/lib/types";

export default function Footer({
  lang,
  storeName,
  settings,
}: {
  lang: Locale;
  storeName: string;
  settings: Settings;
}) {
  const d = getDictionary(lang);
  const h = `/${lang}`;
  const year = new Date().getFullYear();

  const quickLinks = [
    { href: `${h}/books`, label: d.nav.catalog },
    { href: `${h}/categories`, label: d.nav.categories },
    { href: `${h}/about`, label: d.nav.about },
    { href: `${h}/contact`, label: d.nav.contact },
  ];

  const policies = [
    { slug: "shipping", label: d.policies.shipping },
    { slug: "returns", label: d.policies.returns },
    { slug: "privacy", label: d.policies.privacy },
    { slug: "terms", label: d.policies.terms },
  ];

  const socials = [
    { href: settings.instagramUrl, label: "Instagram" },
    { href: settings.facebookUrl, label: "Facebook" },
    { href: settings.telegramUrl, label: "Telegram" },
  ].filter((s) => !!s.href);

  const contactLines = [
    settings.contactPhone,
    settings.contactWhatsapp ? `WhatsApp: ${settings.contactWhatsapp}` : null,
    settings.contactEmail,
    lang === "ar" ? settings.contactAddressAr : settings.contactAddressEn,
  ].filter((v): v is string => !!v);

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold">{storeName}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
            {lang === "ar" ? settings.taglineAr : settings.taglineEn}
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href!}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="badge badge-muted transition hover:bg-accent-soft hover:text-accent"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <nav aria-label={d.footer.quickLinks}>
          <p className="text-sm font-bold">{d.footer.quickLinks}</p>
          <ul className="mt-3 space-y-2">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-muted transition hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={d.policies.title}>
          <p className="text-sm font-bold">{d.policies.title}</p>
          <ul className="mt-3 space-y-2">
            {policies.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`${h}/policies/${p.slug}`}
                  className="text-sm text-muted transition hover:text-accent"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-sm font-bold">{d.contact.info}</p>
          {contactLines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {contactLines.map((line) => (
                <li key={line} className="latin text-sm text-muted">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              <Link href={`${h}/contact`} className="text-accent underline underline-offset-4">
                {d.contact.title}
              </Link>
            </p>
          )}
          <p className="mt-4 text-xs font-semibold text-muted">{d.footer.payment}</p>
          <p className="mt-1 text-sm text-muted">{d.checkout.paymentCod} · {d.checkout.paymentBank}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-muted">
          <p>
            © {year} {storeName}. {d.footer.rights}.
          </p>
          <Link href="/admin" className="transition hover:text-accent">
            {d.nav.admin}
          </Link>
        </div>
      </div>
    </footer>
  );
}
