import type { Tool } from "@/tools/registry";

/** Case-insensitive match against a tool's name, tagline, description, category and keywords. */
export function filterTools(tools: Tool[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((tool) =>
    [tool.name, tool.tagline, tool.description, tool.category, ...(tool.keywords ?? [])].some((s) => s.toLowerCase().includes(q)),
  );
}
