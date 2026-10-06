# Deploying waatnia — GitHub → Vercel → Supabase

Order matters: **the database first** (the Vercel build pushes the schema and
seeds the catalog during `npm run build:vercel`), then Vercel (which pulls from
GitHub). The easiest route is the **Vercel ↔ Supabase integration**: it creates
the Supabase project and fills `DATABASE_URL` (and the other `*_URL`/`SUPABASE_*`
keys) into the Vercel project automatically — no URI to copy by hand.

---

## 1. Create the database via the Vercel ↔ Supabase integration

1. In the Vercel project → **Settings → Integrations** → **Marketplace** → search
   **Supabase** → **Add**. Pick the region closest to your customers; for a
   Syria/Gulf audience that is usually **Frankfurt** (`eu-central-1`) or
   **Bahrain**/`Ashburn` — whichever gives the lowest latency from where you are.
2. Save the database password somewhere safe. **It is not shown again.**
3. The integration writes the connection strings for you. In current versions it
   puts `POSTGRES_URL`/`POSTGRES_PRISMA_URL` on the **transaction pooler (`:6543`)**
   and `POSTGRES_URL_NON_POOLING` on the **direct connection (`:5432`)**. This app
   resolves the URL automatically — it skips any `:6543` URL and uses the
   `:5432` direct connection instead, because checkout runs an **interactive
   transaction** and `prisma db push` needs a direct connection:
   > A transaction-mode pooler cannot serve an interactive transaction — orders
   > would fail at random.
   **No URL has to be copied or edited by hand.** The `SUPABASE_*` auth keys the
   integration also adds are not used here — the admin signs in with a password
   only, so nothing in this app needs Supabase Auth.

### Optional but recommended: the search index

Catalog search uses a leading-wildcard `LIKE`, which a normal index cannot
serve. Apply the trigram index once per database — **Supabase → SQL Editor →
paste `prisma/search-index.sql` → Run**. Without it, search works but scans the
whole `books` table. This is safe to run more than once.

---

## 2. Environment variables

The database URL is handled automatically: the app and the build wrapper fall
back to the Supabase integration's variables — skipping the `:6543` transaction
pooler and using the direct `POSTGRES_URL_NON_POOLING` (`:5432`) — so checkout's
interactive transactions keep working and `prisma db push` can run.
**No URL needs to be copied by hand.** Only two variables are manual:

Generate the session key first. In PowerShell (Windows PowerShell 5.1):

```powershell
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
$b = New-Object byte[] 32
$rng.GetBytes($b)
[Convert]::ToBase64String($b)
```

Pick an admin password of **12+ characters** that is not `change-me-before-deploy`.

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | (optional) | leave unset — `POSTGRES_URL` is mapped automatically; set it only to override |
| `AUTH_SECRET` | the 32 random bytes above | required; the app rejects the placeholder |
| `ADMIN_PASSWORD` | your strong password | read once by the seed |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | can be set later in `/admin/settings` |

Add `AUTH_SECRET` and `ADMIN_PASSWORD` for **all three** environments
(Production / Preview / Development) — these two are **not** created by the
integration.

`ADMIN_PASSWORD` is only read when the owner account does not yet exist, so
re-deploys never reset a password you changed. You can delete it from Vercel
after the first successful deploy.

> The app **refuses to start** if `AUTH_SECRET` is still the `.env.example`
> placeholder or shorter than 32 characters, and the seed **refuses to create
> the owner account** if `ADMIN_PASSWORD` is the placeholder. Copying
> `.env.example` verbatim fails the deploy loudly rather than shipping a
> publicly-known admin password.

---

## 3. Push to GitHub

The repo is already connected to `https://github.com/Silent933/waatnia.git`
with `main` as the tracked branch.

```powershell
git status
git add -A
git commit -m "Harden deploy: guard placeholder secrets, fix stock races, add deploy guide"
git push origin main
```

`node_modules`, `.next`, `.env*` and the source PDFs are already gitignored, and
`public/covers/*` (112 covers) is committed on purpose — they are what the
storefront renders.

---

## 4. Vercel — connect the repo

1. <https://vercel.com/new> → **Add New… → Project**.
2. **Import** the `waatnia` repository. Vercel detects Next.js; leave the
   framework preset on **Next.js**.
3. Add the **Supabase integration** from the marketplace (step 1) — its
   `POSTGRES_URL` is picked up automatically, so there is nothing to copy. Then
   add only `AUTH_SECRET` and `ADMIN_PASSWORD` manually (step 2).
4. Leave **Build Command** and **Output Directory** alone. `vercel.json` sets
   `buildCommand` to `npm run build:vercel`, which runs:
   `prisma generate && prisma db push --skip-generate && npm run db:seed && next build`.
5. **Deploy**.

### What the build does, and why it is safe to re-run

- `prisma db push` applies `schema.prisma` to the database. It is idempotent,
  so a redeploy is a no-op when nothing changed.
- `npm run db:seed` creates the 112 books, the categories, the settings row and
  the owner account **only if they are missing**. Anything already in the
  database is left exactly as it is — so titles, descriptions, covers, prices,
  stock and category assignments you edited in `/admin` are never reverted by a
  later deploy. (This used to be the opposite: every build overwrote your edits.)
  Use `npm run db:seed -- --force` locally if you ever deliberately want to
  re-sync from the source PDFs.

If the build fails with `ENOTFOUND` or `FATAL: … not found`, the database URL
is wrong — check the host (`aws-N-…`) and the password on
`POSTGRES_URL_NON_POOLING` (or on `DATABASE_URL` if you set one) have come
through from the integration.

---

## 5. After the first deploy

1. Visit `/admin` and sign in with `ADMIN_PASSWORD` (there is no email field).
2. `/admin/settings` → set the **site URL** to your real domain, the store name,
   contact details, WhatsApp, and the bank/IBAN shown at checkout.
3. `/admin/settings` → **مدن الشحن المجاني** now takes `COUNTRY:City` entries,
   e.g. `SA:الرياض, SA:Riyadh`. The country prefix is required; without it a
   city matches in every country and a customer can claim free shipping by
   typing "Riyadh" anywhere in the world.
4. Check `/ar` and `/en` render, and that `/admin/books` lists all 112 titles.
5. Place one throwaway order end-to-end to confirm stock, the order number and
   the tracking page.

### Connecting a custom domain

Vercel → **Project → Settings → Domains** → add the domain → point the DNS
record Vercel gives you. Then set the same URL in `/admin/settings` (it takes
precedence over `NEXT_PUBLIC_SITE_URL` for canonicals, sitemap and OpenGraph).

---

## 6. Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | local dev server |
| `npm run build` | production build (no DB needed — falls back to bundled JSON) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint |
| `npm run db:push` | apply `schema.prisma` to `DATABASE_URL` |
| `npm run db:seed` | seed only what is missing |
| `npm run db:seed -- --force` | re-sync books/categories from the source PDFs |
| `npm run db:studio` | browse the database |

### Rolling back a bad deploy

Vercel → **Project → Deployments** → `…` on the previous good build →
**Promote to Production**. The database is not rolled back with it; if the bad
release changed the schema, re-run `npm run db:push` from a known-good commit.
