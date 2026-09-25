import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production. Generate one with: openssl rand -base64 32");
    }
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(adminId: number): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${adminId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expiresAt, signature] = parts;
  if (!safeEqual(signature, sign(`${id}.${expiresAt}`))) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return null;
  return Number(id);
}

export type AdminSession = { id: number; email: string; name: string };

export async function getAdmin(): Promise<AdminSession | null> {
  if (!prisma) return null;
  const store = await cookies();
  const adminId = readSessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!adminId) return null;
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

/** Guard for every admin page and action. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE;
