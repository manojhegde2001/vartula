import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { toolJsonLd, toolMetadata } from "@/lib/seo";
import { getTool, tools } from "@/tools/registry";
import { toolComponents } from "@/tools/components";

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool ? toolMetadata(tool) : {};
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tool = getTool(slug);
  const ToolComponent = toolComponents[slug];
  if (!tool || !ToolComponent) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={toolJsonLd(tool)} />
      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
        <p className="max-w-3xl text-muted-foreground">{tool.description}</p>
      </header>
      <ToolComponent />
    </div>
  );
}
