"use server";

import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requirePrisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

export type ContactFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  name: z.string().trim().min(2, "required").max(120),
  email: z.union([z.literal(""), z.string().trim().email("invalid")]),
  phone: z.string().trim().max(40),
  subject: z.string().trim().max(160),
  body: z.string().trim().min(5, "required").max(4000),
  // Honeypot: real users never fill a hidden field.
  website: z.string().max(0),
});

/** Contact form → dashboard inbox. */
export async function sendMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    subject: formData.get("subject") ?? "",
    body: formData.get("body"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    // Treat the honeypot as a silent success so bots do not learn anything.
    if (fieldErrors.website) return { status: "success" };
    return { status: "error", fieldErrors };
  }

  const { name, email, phone, subject, body } = parsed.data;

  // Cap how fast one address can fill the inbox.
  const waitFor = await enforceRateLimit("message", await clientIp(), 5, 10 * 60_000);
  if (waitFor !== null) {
    return { status: "error", message: `تجاوزت الحد. حاول بعد ${Math.max(1, Math.ceil(waitFor / 60))} دقيقة.` };
  }

  try {
    const prisma = requirePrisma();
    await prisma.message.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        subject: subject || null,
        body,
      },
    });
    await logActivity({ action: "message.created", entity: "message", summary: `${name} — ${subject || "(no subject)"}` });
    return { status: "success" };
  } catch (error) {
    console.error("sendMessage failed:", error);
    return { status: "error", message: "unknown" };
  }
}
