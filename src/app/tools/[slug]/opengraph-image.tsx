import { ogImage, ogSize } from "@/lib/og";
import { getTool, tools } from "@/tools/registry";

export const alt = "Vartula tool preview";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const tool = getTool((await params).slug);
  return ogImage({
    eyebrow: tool ? `${tool.category} · Free online tool` : undefined,
    title: tool?.name ?? "Vartula",
    subtitle: tool?.description ?? "Free, private, in-browser design tools.",
  });
}
