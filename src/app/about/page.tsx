import type { Metadata } from "next";
import Link from "next/link";
import { infoMetadata } from "@/lib/seo";
import { InfoPage, MailLink } from "@/components/info-page";
import { siteConfig } from "@/lib/site";
import { toolPath, tools } from "@/tools/registry";

export const metadata: Metadata = infoMetadata("/about");

export default function AboutPage() {
  return (
    <InfoPage
      path="/about"
      intro={`${siteConfig.name} is a growing collection of free design tools that run entirely in your browser.`}
    >
      <section>
        <h2>Why Vartula exists</h2>
        <p>
          Most online design utilities ask you to upload your work, create an account or sit through ads before you
          can do something simple. Vartula takes the opposite approach: open a tool, do the job, download the result.
        </p>
        <p>
          The name comes from the Sanskrit <em>vartula</em>, meaning “circle” or “round”, a nod to the line-drawing
          animations the first tool creates.
        </p>
      </section>

      <section>
        <h2>What we believe</h2>
        <ul>
          <li>
            <strong>Private by design.</strong> Your files are processed on your own device. They are never uploaded,
            stored or seen by us.
          </li>
          <li>
            <strong>Free, with no sign-up.</strong> Every tool is free to use without an account.
          </li>
          <li>
            <strong>Yours to keep.</strong> Everything you export belongs to you, including for commercial projects.
          </li>
          <li>
            <strong>Fast and focused.</strong> Each tool does one job well and loads only the code it needs.
          </li>
        </ul>
      </section>

      <section>
        <h2>The tools</h2>
        <ul>
          {tools.map((tool) => (
            <li key={tool.slug}>
              <Link href={toolPath(tool.slug)}>{tool.name}</Link>: {tool.description}
            </li>
          ))}
        </ul>
        <p>More tools are on the way.</p>
      </section>

      <section>
        <h2>Open source</h2>
        <p>
          Vartula’s source code is <a href={siteConfig.repo}>available on GitHub</a>, so you can check exactly what
          runs in your browser.
        </p>
      </section>

      <section>
        <h2>Get in touch</h2>
        <p>
          Ideas for a tool, a bug to report or just want to say hello? Email <MailLink email={siteConfig.email} /> or
          visit the <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
