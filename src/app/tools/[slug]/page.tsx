import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, toolJsonLd, toolMetadata } from "@/lib/seo";
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
      <JsonLd data={breadcrumbJsonLd(tool)} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <span aria-current="page" className="text-foreground">
              {tool.name}
            </span>
          </li>
        </ol>
      </nav>
      <header className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
        <p className="max-w-3xl text-muted-foreground">{tool.description}</p>
      </header>
      <ToolComponent />
    </div>
  );
}
