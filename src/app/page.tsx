import type { Metadata } from "next";
import { Gift, LockKeyhole, Zap } from "lucide-react";
import { HeroArt } from "@/components/hero-art";
import { JsonLd } from "@/components/json-ld";
import { ToolGrid } from "@/components/tool-grid";
import { homeJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { tools } from "@/tools/registry";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const reasons = [
  { icon: LockKeyhole, title: "Private by design", text: "Files never leave your device." },
  { icon: Zap, title: "Instant, no install", text: "No account, no download, no waiting." },
  { icon: Gift, title: "Free, no watermarks", text: "Full-quality exports, nothing paywalled." },
];

const highlights = [
  { icon: LockKeyhole, label: "No uploads" },
  { icon: Zap, label: "No sign-up" },
  { icon: Gift, label: "No watermarks" },
];

export default function HomePage() {
  return (
    <div className="space-y-12 overflow-x-clip px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd data={homeJsonLd(tools)} />
      <section className="flex items-center justify-between gap-10">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Design tools that run{" "}
            <span className="bg-linear-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.6_0.17_230)] bg-clip-text text-transparent dark:from-[oklch(0.75_0.16_295)] dark:to-[oklch(0.78_0.13_220)]">
              right in your browser
            </span>
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Animate SVGs and export them as code, video or GIFs. Tools for images, code and color are on the way.
          </p>
          <ul aria-label="Highlights" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="size-4 text-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <HeroArt />
      </section>
      <ToolGrid tools={tools} />
      <section aria-labelledby="why-heading" className="rounded-2xl border bg-muted/40 p-6 sm:p-8">
        <h2 id="why-heading" className="sr-only">
          Why {siteConfig.name}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
