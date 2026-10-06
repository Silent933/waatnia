"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { logActivity } from "@/lib/activity";
import { createSessionToken, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";
import { ADMIN_COOKIE, ADMIN_EMAIL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit, resetRateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string };

const LOGIN_WINDOW_MS = 15 * 60_000;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!prisma) {
    return { error: "قاعدة البيانات غير مربوطة. أضف DATABASE_URL ثم شغّل npm run db:seed." };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "أدخل كلمة المرور." };

  // One owner, one account. The per-account ceiling is the important one here:
  // it survives a botnet spreading attempts across many source addresses.
  const [waitForIp, waitForAccount] = await Promise.all([
    enforceRateLimit("login:ip", await clientIp(), 10, LOGIN_WINDOW_MS),
    enforceRateLimit("login:account", ADMIN_EMAIL, 5, LOGIN_WINDOW_MS),
  ]);
  const waitFor = waitForIp ?? waitForAccount;
  if (waitFor !== null) {
    const minutes = Math.max(1, Math.ceil(waitFor / 60));
    return { error: `محاولات كثيرة جداً. حاول بعد ${minutes} دقيقة.` };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email: ADMIN_EMAIL } });
  // Always run a comparison so a missing account and a wrong password take
  // roughly the same time.
  const hash = admin?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!admin || !ok) return { error: "كلمة المرور غير صحيحة." };

  resetRateLimit("login:account", ADMIN_EMAIL);

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(admin.id, admin.tokenVersion), {
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
