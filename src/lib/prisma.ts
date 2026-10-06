import { PrismaClient } from "@prisma/client";

/**
 * Placeholders that ship in .env.example. Left in place, the URL *looks*
 * configured — so the admin renders its login form and then every query fails
 * with a Postgres authentication error, instead of showing the "database not
 * connected" panel that would actually explain the problem.
 */
const PLACEHOLDER_FRAGMENTS = [
  "[PROJECT-REF]",
  "[PASSWORD]",
  "[REGION]",
  "USER:PASSWORD",
  "HOST/DATABASE",
];

/** True only when a real DATABASE_URL is configured (rejects the .env.example placeholder). */
export function hasDatabase(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (PLACEHOLDER_FRAGMENTS.some((fragment) => url.includes(fragment))) return false;
  return /^postgres(ql)?:\/\/.+/.test(url);
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
      "DATABASE_URL is not configured (or is still the .env.example placeholder). " +
        "Set a PostgreSQL connection string, then run: npm run db:push && npm run db:seed",
    );
  }
  return prisma;
}
