/**
 * Vercel build wrapper.
 *
 * Prisma's schema reads env("DATABASE_URL"), but the Supabase integration does
 * not create that variable — it creates POSTGRES_URL (session pooler, :5432),
 * POSTGRES_URL_NON_POOLING (direct) and POSTGRES_PRISMA_URL. When DATABASE_URL
 * is missing, map it from the integration's variables so `prisma db push`, the
 * seed and `next build` all see a working connection without a hand-copied URL.
 */
import { spawnSync } from "node:child_process";

const candidates = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.POSTGRES_PRISMA_URL,
];

const url = candidates.find(
  (value) => value && /^postgres(ql)?:\/\/.+/.test(value.trim()),
);

if (url && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = url.trim();
}

if (!process.env.DATABASE_URL) {
  console.error(
    "No database URL found. Set DATABASE_URL, or let the Supabase integration " +
      "provide POSTGRES_URL.",
  );
  process.exit(1);
}

const result = spawnSync("npm", ["run", "build:vercel:core"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);