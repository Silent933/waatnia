/**
 * Seeds the database from the extracted catalog.
 *
 *   npm run db:seed
 *
 * Idempotent: categories are upserted by slug, books by sourceId, settings by
 * id = 1. The admin user is only created when it does not already exist, so
 * re-running never resets a password you have changed.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { ADMIN_EMAIL } from "../src/lib/constants";

import arTitles from "../data/ar-titles.json";
import catalog from "../data/catalog.json";
import siteJson from "../data/site.json";

import { bookSlug, normalizeForSearch, smartTitle } from "../src/lib/format";

const prisma = new PrismaClient();

type RawEntry = {
  id: number;
  page: number;
  title_en: string;
  desc_ar_raw: string;
  desc_en_raw: string;
  stock: number;
  cover: string;
  has_cd_tag: boolean;
};

type ArTitles = {
  categories: { slug: string; ar: string; en: string }[];
  books: Record<string, { ar: string; cat: string; author?: string; author_ar?: string }>;
};

async function main() {
  const titles = arTitles as ArTitles;
  const entries = catalog as RawEntry[];
  const defaultPriceCents = siteJson.defaultPriceCents;

  console.log(`Seeding ${entries.length} books and ${titles.categories.length} categories…`);

  // --- categories -------------------------------------------------------
  const categoryIdBySlug = new Map<string, number>();
  for (const [index, c] of titles.categories.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameAr: c.ar, nameEn: c.en, sort: index },
      create: { slug: c.slug, nameAr: c.ar, nameEn: c.en, sort: index },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }

  // --- books ------------------------------------------------------------
  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const meta = titles.books[String(entry.id)];
    if (!meta) {
      console.warn(`  ! no Arabic metadata for entry ${entry.id} — skipped`);
      continue;
    }

    const titleEn = smartTitle(entry.title_en);
    const data = {
      sourceId: entry.id,
      slug: bookSlug(entry.title_en, entry.id),
      titleAr: meta.ar,
      titleEn,
      descAr: entry.desc_ar_raw ?? "",
      descEn: entry.desc_en_raw ?? "",
      author: meta.author ?? null,
      authorAr: meta.author_ar ?? null,
      cover: entry.cover.replace(/^imag\/covers\//, "/covers/"),
      priceCents: defaultPriceCents,
      stock: entry.stock,
      isCd: entry.has_cd_tag,
      active: true,
      categoryId: categoryIdBySlug.get(meta.cat) ?? null,
      searchText: normalizeForSearch(
        `${meta.ar} ${titleEn} ${entry.desc_ar_raw ?? ""} ${entry.desc_en_raw ?? ""}`,
      ),
    };

    const existing = await prisma.book.findUnique({ where: { sourceId: entry.id } });
    if (existing) {
      // Keep any price/stock edits the owner has made in the dashboard.
      await prisma.book.update({
        where: { id: existing.id },
        data: {
          ...data,
          priceCents: existing.priceCents,
          stock: existing.stock,
          active: existing.active,
        },
      });
      updated++;
    } else {
      await prisma.book.create({ data });
      created++;
    }
  }

  console.log(`  books: ${created} created, ${updated} updated`);

  // --- settings ---------------------------------------------------------
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      usdPerSar: siteJson.usdPerSar,
      sypPerSar: siteJson.sypPerSar,
      defaultPriceCents: siteJson.defaultPriceCents,
      currencyDefault: siteJson.currencyDefault,
      shippingFlatCents: siteJson.shippingFlatCents,
      freeCountries: siteJson.freeCountries,
      freeCities: siteJson.freeCities,
      storeNameAr: siteJson.storeNameAr,
      storeNameEn: siteJson.storeNameEn,
      taglineAr: siteJson.taglineAr,
      taglineEn: siteJson.taglineEn,
    },
  });
  console.log("  settings: row id=1 ensured");

  // --- admin ------------------------------------------------------------
  // The owner signs in with a password only; the email is an internal
  // identifier shared with src/lib/constants.ts and never typed by anyone.
  const email = ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) {
    console.warn("  ! ADMIN_PASSWORD not set — skipping admin user creation");
  } else if (password.length < 12) {
    console.warn(
      "  ! ADMIN_PASSWORD is shorter than 12 characters — admin user NOT created.\n" +
        "    Set a stronger ADMIN_PASSWORD in Vercel and redeploy, or create the account from /admin.",
    );
  } else {
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (admin) {
      console.log(`  admin: ${email} already exists (left untouched)`);
    } else {
      await prisma.adminUser.create({
        data: { email, passwordHash: await bcrypt.hash(password, 12), name: "Admin" },
      });
      console.log(`  admin: created ${email}`);
    }
  }

  const total = await prisma.book.count({ where: { active: true } });
  const stock = await prisma.book.aggregate({ where: { active: true }, _sum: { stock: true } });
  console.log(`Done. ${total} active books, ${stock._sum.stock ?? 0} units in stock.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
