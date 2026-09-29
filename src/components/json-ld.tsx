import { serializeJsonLd } from "@/lib/seo";

/** Structured data as a native script tag (recommended by the Next.js JSON-LD guide). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
