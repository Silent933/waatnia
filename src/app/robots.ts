import type { MetadataRoute } from "next";

import { getSettings } from "@/lib/settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = (settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://waatnia.vercel.app").replace(/\/$/, "");

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/api/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
