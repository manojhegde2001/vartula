import { serviceWorkerScript } from "@/lib/service-worker";
import { toolPath, tools } from "@/tools/registry";

export const dynamic = "force-static";

// Evaluated once at build time, so each deployment ships a new version and browsers refresh their cache.
const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || new Date().toISOString();

export function GET() {
  const script = serviceWorkerScript({
    version,
    precache: ["/", "/offline", ...tools.map((t) => toolPath(t.slug))],
    offlinePath: "/offline",
  });
  return new Response(script, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // Browsers must always check for a new worker; next.config.ts sets the same for the CDN.
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  });
}
