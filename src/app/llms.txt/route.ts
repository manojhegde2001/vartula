import { llmsTxt } from "@/lib/tool-content";
import { tools } from "@/tools/registry";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(tools), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
