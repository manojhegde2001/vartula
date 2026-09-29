import { ToolGrid } from "@/components/tool-grid";
import { siteConfig } from "@/lib/site";
import { tools } from "@/tools/registry";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-14">
      <section className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{siteConfig.tagline}.</h1>
        <p className="text-lg text-muted-foreground">{siteConfig.description}</p>
      </section>
      <ToolGrid tools={tools} />
    </div>
  );
}
