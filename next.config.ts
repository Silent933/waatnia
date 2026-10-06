import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // `app/global-not-found.tsx` is ignored unless this is on. It is what serves a
  // URL matching no route, and no amount of `not-found.tsx` can cover those: the
  // two root layouts plus the `[lang]` segment leave a bare 404 with nowhere to
  // render, which is the one case a visitor is most likely to hit from a bad link.
  experimental: {
    globalNotFound: true,
  },
  // The store lives entirely under a [lang] segment (/ar, /en) so that every
  // page can set its own lang and dir, and there are two root layouts. That
  // leaves "/" matching no route at all, which is what a visitor typing the
  // bare domain would hit. Point it at the default locale before routing.
  // Temporary (307) rather than permanent: a browser that has cached a 308
  // will not come back here to pick up a changed default.
  async redirects() {
    return [{ source: "/", destination: "/ar", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Admin screens must never be framed — blocks clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Stop a browser from guessing a response type and running it.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Keeps the admin token out of any outbound Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for a year. No includeSubDomains: a subdomain that has
          // no certificate yet would become unreachable.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          // Do not let a browser guess /admin, /track, or asset extensions.
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          // This app needs no camera, microphone, geolocation or payment access.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Production only. `next dev` needs 'unsafe-eval' for React Fast
          // Refresh and a websocket for HMR, and a CSP strict enough to be
          // worth having would break both.
          ...(isProduction
            ? [
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    // Next injects inline bootstrap/hydration scripts, and the
                    // Product JSON-LD block is inline, so 'unsafe-inline' is
                    // unavoidable here. This still blocks remote script and
                    // object injection.
                    "script-src 'self' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob: https://*.supabase.co",
                    "font-src 'self' data:",
                    "connect-src 'self'",
                    "frame-ancestors 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "object-src 'none'",
                    "upgrade-insecure-requests",
                  ].join("; "),
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
