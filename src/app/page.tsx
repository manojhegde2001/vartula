import type { Metadata } from "next";
import { Gift, LockKeyhole, Zap } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { ToolGrid } from "@/components/tool-grid";
import { homeJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { tools } from "@/tools/registry";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const reasons = [
  {
    icon: LockKeyhole,
    title: "Private by design",
    text: "Every tool runs in your browser. Your files are never uploaded, stored or seen by anyone else.",
  },
  {
    icon: Zap,
    title: "Instant, no install",
    text: "Open a tool and start working. No accounts, no downloads, no waiting for a server to process your files.",
  },
  {
    icon: Gift,
    title: "Free, without watermarks",
    text: "Export code, video, GIF and images at full quality. Nothing is locked behind a paywall.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-14">
      <JsonLd data={homeJsonLd(tools)} />
      <section className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{siteConfig.tagline}.</h1>
        <p className="text-lg text-muted-foreground">{siteConfig.description}</p>
      </section>
      <ToolGrid tools={tools} />
      <section aria-labelledby="why-heading" className="space-y-6">
        <h2 id="why-heading" className="text-xl font-semibold tracking-tight">
          Why {siteConfig.name}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }) => (
            <li key={title} className="space-y-2">
              <Icon className="size-5 text-primary" aria-hidden />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
