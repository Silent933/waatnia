/**
 * Vercel build wrapper.
 *
 * Prisma's schema reads env("DATABASE_URL"), but the Supabase integration does
 * not create that variable. Map it from the integration's variables — skipping
 * the :6543 transaction pooler, which cannot serve `prisma db push` — so the
 * push, the seed and `next build` all see a working connection.
 */
import { spawnSync } from "node:child_process";
import { resolveDatabaseUrl } from "./database-url.mjs";

const url = resolveDatabaseUrl();

if (url && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = url.trim();
}

if (!process.env.DATABASE_URL) {
  console.error(
    "No database URL found. Set DATABASE_URL, or let the Supabase integration " +
      "provide POSTGRES_URL_NON_POOLING / POSTGRES_URL.",
  );
  process.exit(1);
}

const result = spawnSync("npm", ["run", "build:vercel:core"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);