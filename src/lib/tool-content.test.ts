import { describe, expect, it } from "vitest";
import { toolContents } from "@/tools/content";
import { getTool, tools } from "@/tools/registry";
import { llmsFullTxt, llmsTxt, toolMarkdown, toolMarkdownPath } from "./tool-content";

const tool = getTool("svg-animator")!;
const content = toolContents["svg-animator"];

describe("tool content for AI agents", () => {
  it("builds an llms.txt index with a title, summary and a link per tool", () => {
    const txt = llmsTxt(tools);
    expect(txt.startsWith("# Vartula\n\n> ")).toBe(true);
    expect(txt).toContain("## Tools");
    expect(txt).toMatch(/- \[SVG Animator\]\(https?:\/\/.+\/tools\/svg-animator\.md\): /);
    expect(txt).toContain("/llms-full.txt");
  });

  it("renders a tool as Markdown with steps, formats and FAQ", () => {
    const md = toolMarkdown(tool, content);
    expect(md.startsWith("# SVG Animator\n\n> ")).toBe(true);
    expect(md).toContain(`## ${content.howToTitle}`);
    expect(md).toContain(`1. ${content.howTo[0]}`);
    expect(md).toContain("- **SMIL**: ");
    expect(md).toContain(`### ${content.faq[0].question}`);
  });

  it("nests tool headings one level down in llms-full.txt", () => {
    const full = llmsFullTxt([{ tool, content }]);
    expect(full).toContain("\n## SVG Animator\n");
    expect(full).toContain(`\n### ${content.howToTitle}\n`);
    expect(full.match(/^# /gm)).toHaveLength(1);
  });

  it("puts the Markdown twin next to the tool URL", () => {
    expect(toolMarkdownPath("svg-animator")).toBe("/tools/svg-animator.md");
  });
});
