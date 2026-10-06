# Deploying waatnia — GitHub → Vercel → Supabase

Order matters: **Supabase first** (it produces the `DATABASE_URL` Vercel needs),
then Vercel (which pulls from GitHub), then the first deploy applies the schema
and seeds the catalog.

---

## 1. Supabase — create the database

1. <https://supabase.com/dashboard> → **New project**.
   - Pick the region closest to your customers. For a Syria/Gulf audience that is
     usually **Frankfurt** (`eu-central-1`) or **Bahrain**/`Ashburn` — whichever
     gives the lowest latency from where you are.
2. Save the database password somewhere safe. **It is not shown again.**
3. **Connect → Connection method: Session pooler** (port `5432`).
   > Use the **Session** pooler, not the Transaction pooler. Checkout runs an
   > interactive transaction, and a transaction-mode pooler (`6543`) cannot serve
   > one — orders would fail at random.
4. Copy the URI. It looks like:
   ```
   postgresql://postgres.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres
   ```
   Turn it into the form Prisma wants — the username is **`prisma.<PROJECT-REF>`**
   (not `postgres.<PROJECT-REF>`):
   ```
   postgresql://prisma.<PROJECT-REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=1
   ```
   - `sslmode=require` — never connect unencrypted.
   - `connection_limit=1` — Vercel serverless: one session per instance.
   - The `aws-0-…` cluster index cannot be guessed; copy the host verbatim.

### Optional but recommended: the search index

Catalog search uses a leading-wildcard `LIKE`, which a normal index cannot
serve. Apply the trigram index once per database — **Supabase → SQL Editor →
paste `prisma/search-index.sql` → Run**. Without it, search works but scans the
whole `books` table. This is safe to run more than once.

---

## 2. Environment variables

Generate the session key first. In PowerShell:

```powershell
$b = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($b)
[Convert]::ToBase64String($b)
```

Pick an admin password of **12+ characters** that is not `change-me-before-deploy`.

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | the URI from step 1 | required |
| `AUTH_SECRET` | the 32 random bytes above | required; the app rejects the placeholder |
| `ADMIN_PASSWORD` | your strong password | read once by the seed |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | can be set later in `/admin/settings` |

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
3. Leave **Build Command** and **Output Directory** alone. `vercel.json` sets
   `buildCommand` to `npm run build:vercel`, which runs:
   `prisma generate && prisma db push --skip-generate && npm run db:seed && next build`.
4. **Environment Variables** → add all four from step 2, for **all three**
   environments (Production / Preview / Development).
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

If the build fails with `ENOTFOUND` or `FATAL: … not found`, the `DATABASE_URL`
is wrong — check the `prisma.` username prefix and the `aws-N-` host index.

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
