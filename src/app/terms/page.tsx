import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, MailLink } from "@/components/info-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms for using ${siteConfig.name}'s free in-browser design tools, and who owns what you create.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoPage path="/terms" intro={`By using ${siteConfig.name}, you agree to these terms. They’re short, we promise.`}>
      <section>
        <h2>Using the tools</h2>
        <p>
          {siteConfig.name} offers free design tools that run in your web browser. You may use them for personal and
          commercial work. No account is needed.
        </p>
      </section>

      <section>
        <h2>Your content is yours</h2>
        <p>
          You keep all rights to the files you open and to everything you create or export with {siteConfig.name},
          including images, video and generated code. We claim no ownership or license over it, and because the tools
          run on your device, we never receive a copy.
        </p>
        <p>
          You are responsible for making sure you have the right to use the files you work with, for example that you
          own or have permission to use a logo or illustration you animate.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>Please don’t:</p>
        <ul>
          <li>use {siteConfig.name} to create content that is illegal or infringes someone else’s rights,</li>
          <li>attempt to disrupt, overload or gain unauthorized access to the website or its hosting,</li>
          <li>present a copy of the site as your own service.</li>
        </ul>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          {siteConfig.name} is provided free of charge, “as is” and “as available”, without warranties of any kind,
          express or implied, including fitness for a particular purpose. Results can vary by browser and device, and we
          can’t guarantee that a tool will be available, error-free or suitable for your needs. Keep your own copies of
          important work.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, {siteConfig.name} is not liable for any indirect, incidental or
          consequential damages, or for any loss of data, profits or business, arising from your use of the site or its
          tools. Nothing in these terms limits rights you have under consumer protection laws that can’t be waived.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may add, change or remove tools, and we may update these terms. When we do, we’ll change the date at the
          top of this page. Continuing to use {siteConfig.name} after an update means you accept the new terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Email <MailLink email={siteConfig.email} />. How we handle data is covered in
          our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
