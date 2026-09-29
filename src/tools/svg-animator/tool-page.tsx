import { ChevronDown } from "lucide-react";
import { SvgAnimatorEditor } from "./components/editor";
import { faq, howToSteps } from "./content";

export default function SvgAnimatorToolPage() {
  return (
    <>
      <SvgAnimatorEditor />

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="how-heading" className="space-y-4">
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">
            How to animate an SVG
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            {howToSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3 className="pt-4 text-lg font-semibold">A line-drawing animator that runs in your browser</h3>
          <p className="text-muted-foreground">
            The SVG Animator turns logos, icons, signatures and illustrations into the popular “self-drawing” effect.
            Strokes are traced with <code className="font-mono text-foreground">stroke-dashoffset</code> and fills fade in
            afterwards, each with its own duration, delay, per-shape stagger, easing curve and direction.
          </p>
          <p className="text-muted-foreground">
            One animation engine drives the live preview and every export, so the CSS, SMIL, React, vanilla JavaScript
            and GSAP code, and the MP4, WebM, GIF and PNG renders, all match what you see. Nothing is uploaded: your SVG is
            sanitized and processed locally.
          </p>
        </section>

        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="divide-y rounded-xl border">
            {faq.map((item) => (
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
