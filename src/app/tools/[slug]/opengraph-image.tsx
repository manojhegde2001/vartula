import { ogImage, oklchHex, ogSize } from "@/lib/og";
import { categoryInfo, getTool, tools } from "@/tools/registry";
import { toolOgArt } from "@/tools/og-art";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

/** One card per tool, with alt text naming the tool (a plain `alt` export can't vary by route). */
export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const tool = getTool((await params).slug);
  return [
    {
      id: "card",
      alt: tool ? `${tool.name} on Vartula: ${tool.tagline}` : "Vartula tool preview",
      size: ogSize,
      contentType: "image/png",
    },
  ];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const tool = getTool((await params).slug);
  if (!tool) return ogImage({ title: "Vartula", subtitle: "Free, private, in-browser design tools." });
  const accent = oklchHex(categoryInfo[tool.category].hue);
  const Art = toolOgArt[tool.slug];
  return ogImage({
    eyebrow: `${tool.category} · Free online tool`,
    title: tool.name,
    subtitle: `${tool.tagline}. Runs in your browser.`,
    accent,
    art: Art ? <Art accent={accent} /> : undefined,
  });
}
