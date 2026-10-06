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
 * does not set it — it sets POSTGRES_URL (session pooler, :5432),
 * POSTGRES_URL_NON_POOLING (direct) and POSTGRES_PRISMA_URL. Fall back through
 * the integration's variables so a deploy needs no hand-copied URL, and prefer
 * the session/direct connections over the transaction pooler: checkout runs an
 * interactive transaction, which a :6543 transaction-mode pooler cannot serve.
 */
function databaseUrl(): string {
  const candidate =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    "";
  return candidate.trim();
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