import { absoluteUrl, siteConfig } from "@/lib/site";
import { toolPath, type Tool } from "@/tools/registry";

/**
 * Long-form copy for a tool. Rendered as HTML on the tool page and as Markdown for
 * AI agents (/llms.txt, /llms-full.txt, /tools/<slug>.md). Text may use `backticks` for code.
 */
export interface ToolContent {
  summaryTitle: string;
  summary: string[];
  howToTitle: string;
  howTo: string[];
  features: { title: string; items: { name: string; description: string }[] };
  faq: { question: string; answer: string }[];
}

export function toolMarkdownPath(slug: string) {
  return `${toolPath(slug)}.md`;
}

/** Full Markdown document for one tool. `level` shifts headings when embedded in llms-full.txt. */
export function toolMarkdown(tool: Tool, content: ToolContent, level = 1): string {
  const h = (n: number) => "#".repeat(level + n - 1);
  return [
    `${h(1)} ${tool.name}`,
    `> ${tool.description}`,
    [
      `- URL: ${absoluteUrl(toolPath(tool.slug))}`,
      `- Category: ${tool.category}`,
      "- Price: free, no sign-up",
      "- Privacy: runs entirely in the browser; files are never uploaded",
      `- Last updated: ${tool.updated}`,
    ].join("\n"),
    `${h(2)} ${content.summaryTitle}`,
    ...content.summary,
    `${h(2)} ${content.howToTitle}`,
    content.howTo.map((step, i) => `${i + 1}. ${step}`).join("\n"),
    `${h(2)} ${content.features.title}`,
    content.features.items.map((f) => `- **${f.name}**: ${f.description}`).join("\n"),
    `${h(2)} Frequently asked questions`,
    ...content.faq.map((item) => `${h(3)} ${item.question}\n\n${item.answer}`),
  ].join("\n\n");
}

const intro = siteConfig.description;

/** /llms.txt index, following https://llmstxt.org. */
export function llmsTxt(tools: Tool[]): string {
  return [
    `# ${siteConfig.name}`,
    `> ${siteConfig.tagline}.`,
    intro,
    "## Tools",
    tools
      .map((t) => `- [${t.name}](${absoluteUrl(toolMarkdownPath(t.slug))}): ${t.description} Web app: ${absoluteUrl(toolPath(t.slug))}`)
      .join("\n"),
    "## Optional",
    [
      `- [Full documentation in one file](${absoluteUrl("/llms-full.txt")}): every tool's guide and FAQ`,
      `- [Source code](${siteConfig.repo})`,
    ].join("\n"),
  ].join("\n\n") + "\n";
}

/** /llms-full.txt: every tool's Markdown in one document. */
export function llmsFullTxt(entries: { tool: Tool; content: ToolContent }[]): string {
  return [
    `# ${siteConfig.name}`,
    `> ${siteConfig.tagline}.`,
    intro,
    ...entries.map(({ tool, content }) => toolMarkdown(tool, content, 2)),
  ].join("\n\n") + "\n";
}
