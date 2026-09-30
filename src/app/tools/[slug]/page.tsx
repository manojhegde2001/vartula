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
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-4">
      <JsonLd data={toolJsonLd(tool)} />
      <JsonLd data={breadcrumbJsonLd(tool)} />
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground lg:mb-1 lg:text-xs">
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
      <header className="mb-4 space-y-1 lg:flex lg:items-baseline lg:gap-4 lg:space-y-0">
        <h1 className="shrink-0 text-2xl font-bold tracking-tight">{tool.name}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground lg:max-w-none lg:min-w-0 lg:truncate" title={tool.description}>
          {tool.description}
        </p>
      </header>
      <ToolComponent />
    </div>
  );
}
