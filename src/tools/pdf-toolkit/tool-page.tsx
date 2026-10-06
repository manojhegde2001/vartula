import { ChevronDown } from "lucide-react";
import { InlineCode } from "@/components/inline-code";
import { JsonLd } from "@/components/json-ld";
import { PdfToolkitEditorLoader } from "./components/editor-loader";
import { content } from "./content";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: content.faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function PdfToolkitToolPage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      <PdfToolkitEditorLoader />

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <div className="space-y-10">
          <section aria-labelledby="how-heading" className="space-y-4">
            <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">
              {content.howToTitle}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              {content.howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h3 className="pt-4 text-lg font-semibold">{content.summaryTitle}</h3>
            {content.summary.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground">
                <InlineCode text={paragraph} />
              </p>
            ))}
          </section>

          <section aria-labelledby="features-heading" className="space-y-4">
            <h2 id="features-heading" className="text-2xl font-semibold tracking-tight">
              {content.features.title}
            </h2>
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Tool</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.features.items.map((item) => (
                  <tr key={item.name}>
                    <th scope="row" className="py-2 pr-4 text-left align-top font-medium whitespace-nowrap">
                      {item.name}
                    </th>
                    <td className="py-2 text-muted-foreground">
                      <InlineCode text={item.description} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="divide-y rounded-xl border">
            {content.faq.map((item) => (
              <details key={item.question} className="group px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.question}
                  <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
