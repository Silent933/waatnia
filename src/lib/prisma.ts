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

/**
 * Resolve the connection string.
 *
 * DATABASE_URL is the canonical variable, but the Vercel Supabase integration
 * does not set it. The integration's variables are POSTGRES_URL and
 * POSTGRES_PRISMA_URL (transaction pooler, :6543) and the direct
 * POSTGRES_URL_NON_POOLING (:5432). A transaction-mode pooler cannot serve an
 * interactive transaction — checkout runs one — so skip `:6543` and prefer the
 * direct/session connection. Keep in sync with scripts/database-url.mjs.
 */
function databaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ].filter((value): value is string => Boolean(value));

  if (candidates.some((url) => /:6543\b/.test(url))) {
    return (
      candidates.find((url) => !/:6543\b/.test(url))?.trim() ??
      candidates[0].trim()
    );
  }
  return (candidates[0] ?? "").trim();
}

/** True only when a real database URL is configured (rejects the .env.example placeholders). */
export function hasDatabase(): boolean {
  const url = databaseUrl();
  if (!url) return false;
  if (PLACEHOLDER_FRAGMENTS.some((fragment) => url.includes(fragment))) return false;
  return /^postgres(ql)?:\/\/.+/.test(url);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient | null = hasDatabase()
  ? (globalForPrisma.prisma ??
    new PrismaClient({
      datasourceUrl: databaseUrl(),
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }))
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

/** Throws a clear error instead of a cryptic Prisma one when the DB is missing. */
export function requirePrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "No database URL is configured (or it is still the .env.example placeholder). " +
        "Set DATABASE_URL or the Supabase integration's POSTGRES_URL, then run: " +
        "npm run db:push && npm run db:seed",
    );
  }
  return prisma;
}