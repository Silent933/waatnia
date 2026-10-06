/**
 * Shared database-URL resolution for the Vercel build (the app has its own
 * copy in src/lib/prisma.ts — they must stay in sync).
 *
 * The Supabase Vercel integration does not set DATABASE_URL. Its variables are:
 *   - POSTGRES_URL            → transaction pooler   (:6543)
 *   - POSTGRES_PRISMA_URL     → transaction pooler   (:6543)
 *   - POSTGRES_URL_NON_POOLING→ direct connection    (:5432)
 *
 * A transaction-mode pooler cannot serve an interactive transaction (checkout
 * uses one) and Prisma needs a direct connection for `db push`, so we skip
 * `:6543` URLs and prefer the direct / session connection.
 */
const PLACEHOLDER_FRAGMENTS = [
  "[PROJECT-REF]",
  "[PASSWORD]",
  "[REGION]",
  "USER:PASSWORD",
  "HOST/DATABASE",
];

function isRealPostgres(value) {
  return (
    !!value &&
    PLACEHOLDER_FRAGMENTS.every((fragment) => !value.includes(fragment)) &&
    /^postgres(ql)?:\/\/.+/.test(value.trim())
  );
}

export function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ].filter(isRealPostgres);

  return (
    candidates.find((url) => !/:6543\b/.test(url)) ??
    candidates[0] ??
    ""
  );
}