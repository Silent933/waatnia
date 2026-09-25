import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/store/ContactForm";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/settings";
import { isLocale } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).contact.title, description: getDictionary(lang).contact.subtitle };
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const d = getDictionary(lang);
  const settings = await getSettings();

  const contactLines = [
    settings.contactPhone,
    settings.contactWhatsapp,
    settings.contactEmail,
    lang === "ar" ? settings.contactAddressAr : settings.contactAddressEn,
  ].filter((v): v is string => !!v);

  return (
    <div className="container-page py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl">{d.contact.title}</h1>
          <p className="mt-2 text-ink-soft">{d.contact.subtitle}</p>
          <div className="mt-8">
            <ContactForm lang={lang} />
          </div>
        </div>

        <aside className="card p-5">
          <h2 className="text-sm font-bold">{d.contact.info}</h2>
          {contactLines.length === 0 ? (
            <p className="mt-2 text-sm text-muted">—</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {contactLines.map((line) => (
                <li key={line} className="latin text-muted">{line}</li>
              ))}
            </ul>
          )}

          {settings.contactWhatsapp && (
            <a
              href={`https://wa.me/${settings.contactWhatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary mt-4 w-full"
            >
              WhatsApp
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
