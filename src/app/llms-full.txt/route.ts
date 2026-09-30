import { llmsFullTxt } from "@/lib/tool-content";
import { toolContents } from "@/tools/content";
import { tools } from "@/tools/registry";

export const dynamic = "force-static";

export function GET() {
  const body = llmsFullTxt(tools.map((tool) => ({ tool, content: toolContents[tool.slug] })));
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
