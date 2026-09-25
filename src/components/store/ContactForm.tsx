"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { sendMessage, type ContactFormState } from "@/app/actions/messages";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types";

const initialState: ContactFormState = { status: "idle" };

function SendButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ContactForm({ lang }: { lang: Locale }) {
  const d = getDictionary(lang);
  const [state, formAction] = useActionState(sendMessage, initialState);

  if (state.status === "success") {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok-soft text-ok">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-6 w-6 fill-none stroke-current stroke-2.5">
            <path d="m4 10.5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-4 text-lg font-semibold">{d.contact.success}</p>
      </div>
    );
  }

  const err = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">{d.contact.name}</label>
          <input id="c-name" name="name" className="field" required />
          {err("name") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
        </div>
        <div>
          <label className="label" htmlFor="c-phone">
            {d.contact.phone} <span className="font-normal text-muted">({d.contact.phoneOptional})</span>
          </label>
          <input id="c-phone" name="phone" type="tel" className="field" dir="ltr" />
        </div>
        <div>
          <label className="label" htmlFor="c-email">
            {d.contact.email} <span className="font-normal text-muted">({d.contact.emailOptional})</span>
          </label>
          <input id="c-email" name="email" type="email" className="field" dir="ltr" />
          {err("email") && <p className="mt-1 text-xs text-danger">{d.common.error}</p>}
        </div>
        <div>
          <label className="label" htmlFor="c-subject">{d.contact.subject}</label>
          <input id="c-subject" name="subject" className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-body">{d.contact.message}</label>
          <textarea id="c-body" name="body" rows={6} className="field" required />
          {err("body") && <p className="mt-1 text-xs text-danger">{d.common.required}</p>}
        </div>
      </div>

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {d.common.error}
        </p>
      )}

      <div className="mt-5">
        <SendButton label={d.contact.send} pendingLabel={d.contact.sending} />
      </div>
    </form>
  );
}
