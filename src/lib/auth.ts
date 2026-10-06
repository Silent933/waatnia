import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Values that ship in .env.example. They are long enough to pass any
 * "is it set / is it long enough" check, so without this list a copy-paste
 * would sign every session with a publicly known key — which lets anyone
 * forge a cookie for admin id 1.
 */
const INSECURE_SECRETS = new Set([
  "replace-with-32-random-bytes-base64",
  "dev-only-insecure-secret-do-not-use-in-production",
  "change-me-before-deploy",
  "change-me",
  "secret",
]);

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production. Generate one with: openssl rand -base64 32");
    }
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  // A known placeholder is as fatal as a missing value, and far more likely to
  // slip through: refuse it in every environment so it fails loudly on deploy.
  if (INSECURE_SECRETS.has(value.trim())) {
    throw new Error(
      "AUTH_SECRET is still the .env.example placeholder. Generate a real one with: openssl rand -base64 32",
    );
  }
  if (value.trim().length < 32 && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be at least 32 characters long. Generate one with: openssl rand -base64 32");
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

export function createSessionToken(adminId: number, tokenVersion = 0): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${adminId}.${tokenVersion}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): { id: number; tokenVersion: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, tokenVersion, expiresAt, signature] = parts;
  if (!safeEqual(signature, sign(`${id}.${tokenVersion}.${expiresAt}`))) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return null;
  return { id: Number(id), tokenVersion: Number(tokenVersion) || 0 };
}

export type AdminSession = { id: number; email: string; name: string };

export async function getAdmin(): Promise<AdminSession | null> {
  if (!prisma) return null;
  const store = await cookies();
  const session = readSessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  const admin = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!admin) return null;
  // A password change bumps tokenVersion, which retires every cookie issued
  // before it.
  if (admin.tokenVersion !== session.tokenVersion) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

/** Guard for every admin page and action. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE;
