"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { logActivity } from "@/lib/activity";
import { createSessionToken, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";
import { ADMIN_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!prisma) {
    return { error: "قاعدة البيانات غير مربوطة. أضف DATABASE_URL ثم شغّل npm run db:seed." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "أدخل البريد وكلمة المرور." };

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  // Always run a comparison so a missing account and a wrong password take
  // roughly the same time.
  const hash = admin?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!admin || !ok) return { error: "بيانات الدخول غير صحيحة." };

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
