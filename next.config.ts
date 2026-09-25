import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;
