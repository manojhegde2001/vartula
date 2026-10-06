import type { Metadata } from "next";
import { infoMetadata } from "@/lib/seo";
import { InfoPage, MailLink } from "@/components/info-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = infoMetadata("/contact");

export default function ContactPage() {
  return (
    <InfoPage path="/contact" intro="We read every message. Here’s the best way to reach us.">
      <section>
        <h2>Email</h2>
        <p>
          For questions, feedback, partnerships or privacy requests, email <MailLink email={siteConfig.email} />. We
          usually reply within a few days.
        </p>
      </section>

      <section>
        <h2>Bugs and tool requests</h2>
        <p>
          Found something broken, or have an idea for a new tool? Open an issue on{" "}
          <a href={`${siteConfig.repo}/issues`}>GitHub</a>, or email us. For bugs, it helps to include:
        </p>
        <ul>
          <li>the tool and what you were trying to do,</li>
          <li>your browser and operating system,</li>
          <li>the file you used, if you’re comfortable sharing it.</li>
        </ul>
      </section>

      <section>
        <h2>A note on privacy</h2>
        <p>
          Because your files never leave your browser, we can’t see or recover them. If a problem depends on a
          particular file, please attach it to your message.
        </p>
      </section>
    </InfoPage>
  );
}
