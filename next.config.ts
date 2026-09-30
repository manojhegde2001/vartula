import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Markdown version of each tool page for AI agents (see src/app/markdown).
      { source: "/tools/:slug([a-z0-9-]+)\.md", destination: "/markdown/tools/:slug" },
    ];
  },
};

export default nextConfig;
