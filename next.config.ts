import type { NextConfig } from "next";

// Kept free of script-src/style-src rules: Next, next-themes and JSON-LD use inline scripts,
// and exports use blob: URLs. These directives block framing, plugins and <base> hijacking.
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The production vercel.app alias duplicates the site; send it to the canonical domain.
      {
        source: "/:path*",
        has: [{ type: "host", value: "vartula.vercel.app" }],
        destination: "https://www.vartula.net/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // Markdown version of each tool page for AI agents (see src/app/markdown).
      { source: "/tools/:slug([a-z0-9-]+)\\.md", destination: "/markdown/tools/:slug" },
    ];
  },
};

export default nextConfig;
