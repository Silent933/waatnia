"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { logActivity } from "@/lib/activity";
import { createSessionToken, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";
import { ADMIN_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, resetRateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string };

const LOGIN_WINDOW_MS = 15 * 60_000;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!prisma) {
    return { error: "قاعدة البيانات غير مربوطة. أضف DATABASE_URL ثم شغّل npm run db:seed." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "أدخل البريد وكلمة المرور." };

  // Two independent ceilings, both checked before any password comparison:
  // the IP one stops one noisy source, the account one stops a distributed
  // run of guesses against a single inbox.
  const [waitForIp, waitForAccount] = await Promise.all([
    enforceRateLimit("login:ip", await clientIp(), 10, LOGIN_WINDOW_MS),
    enforceRateLimit("login:email", email, 5, LOGIN_WINDOW_MS),
  ]);
  const waitFor = waitForIp ?? waitForAccount;
  if (waitFor !== null) {
    const minutes = Math.max(1, Math.ceil(waitFor / 60));
    return { error: `محاولات كثيرة جداً. حاول بعد ${minutes} دقيقة.` };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Always run a comparison so a missing account and a wrong password take
  // roughly the same time.
  const hash = admin?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!admin || !ok) return { error: "بيانات الدخول غير صحيحة." };

  resetRateLimit("login:email", email);

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  await logActivity({ action: "auth.login", entity: "admin", entityId: String(admin.id), summary: admin.email });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
