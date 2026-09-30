"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/** Cookieless page views. The #hash carries shared tool settings, so it never leaves the browser. */
export function Analytics() {
  return <VercelAnalytics beforeSend={(event) => ({ ...event, url: event.url.split("#")[0] })} />;
}
