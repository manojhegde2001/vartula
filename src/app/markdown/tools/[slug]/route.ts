import { absoluteUrl } from "@/lib/site";
import { toolMarkdown } from "@/lib/tool-content";
import { toolContents } from "@/tools/content";
import { getTool, toolPath, tools } from "@/tools/registry";

// Served at /tools/<slug>.md through a rewrite in next.config.ts.
export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function GET(_request: Request, { params }: RouteContext<"/markdown/tools/[slug]">) {
  const { slug } = await params;
  const tool = getTool(slug);
  const content = toolContents[slug];
  if (!tool || !content) return new Response("Not found", { status: 404 });
  return new Response(toolMarkdown(tool, content) + "\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The HTML page is the version to index; this is its Markdown twin.
      Link: `<${absoluteUrl(toolPath(slug))}>; rel="canonical"`,
    },
  });
}
