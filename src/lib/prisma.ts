import { PrismaClient } from "@prisma/client";

/** True only when a real DATABASE_URL is configured (rejects the .env.example placeholder). */
export function hasDatabase(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (url.includes("USER:PASSWORD") || url.includes("HOST/DATABASE")) return false;
  return true;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient | null = hasDatabase()
  ? (globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] }))
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

/** Throws a clear error instead of a cryptic Prisma one when the DB is missing. */
export function requirePrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env and set a PostgreSQL connection string, then run: npx prisma migrate deploy && npm run db:seed",
    );
  }
  return prisma;
}
