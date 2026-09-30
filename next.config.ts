import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
