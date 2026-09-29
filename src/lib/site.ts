export const siteConfig = {
  name: "Vartula",
  tagline: "Free, private, in-browser design tools",
  description:
    "Vartula is a growing collection of free design tools that run entirely in your browser. Animate SVGs, export video and code — no uploads, no sign-up.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vartula.vercel.app").replace(/\/$/, ""),
  repo: "https://github.com/manojhegde2001/vartula",
} as const;

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
