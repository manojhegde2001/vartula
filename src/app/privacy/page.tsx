import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, MailLink } from "@/components/info-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `${siteConfig.name} processes your files in your browser and never uploads them. Read what little data we do handle.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      path="/privacy"
      intro="The short version: your files never leave your device, we don’t use cookies, and we don’t sell or share personal data."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          This policy covers the {siteConfig.name} website at{" "}
          <a href={siteConfig.url}>{siteConfig.url.replace(/^https:\/\//, "")}</a> (“{siteConfig.name}”, “we”, “us”).
          If you have questions, email <MailLink email={siteConfig.email} />.
        </p>
      </section>

      <section>
        <h2>Your files stay on your device</h2>
        <p>
          Every {siteConfig.name} tool runs entirely in your web browser. The files you open, their contents, your
          settings and everything you export are processed locally on your device. They are{" "}
          <strong>never uploaded</strong> to our servers or anyone else’s, and we have no way to see them.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <p>We don’t have accounts, sign-ups or forms, so we never ask for your name or email address. We handle only:</p>
        <ul>
          <li>
            <strong>Anonymous usage statistics.</strong> We use{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel Web Analytics</a> to count page views. It
            records the page address, the referring site, your country and your browser, operating system and device
            type. It uses no cookies, and it doesn’t identify you or follow you across other websites. Visitors are
            told apart by a hash of the request that is discarded after 24 hours. We never send the part of the address
            after “#”, which holds shared tool settings.
          </li>
          <li>
            <strong>Server logs.</strong> Like any website, our hosting provider{" "}
            <a href="https://vercel.com/legal/privacy-policy">Vercel</a> processes technical data such as your IP
            address, browser and the pages you request so it can deliver the site and protect it from abuse. These logs
            are kept for a short time and are not used to profile you.
          </li>
          <li>
            <strong>Emails you send us.</strong> If you write to us, we use your email address and message only to
            reply, and delete them when they’re no longer needed.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>
          {siteConfig.name} sets no cookies. Your browser’s local storage remembers your light or dark theme preference
          on your device. When you copy a share link, the tool settings are placed in the link after “#”. Browsers
          don’t send that part of an address to any server, so only the people you share the link with see it.
        </p>
      </section>

      <section>
        <h2>Sharing and selling</h2>
        <p>
          We don’t sell, rent or trade personal data, and we don’t show ads. The only third party that processes data
          for us is Vercel, which hosts the site and provides the analytics described above.
        </p>
        <p>
          Code you export may reference third-party libraries. For example, the GSAP export loads GSAP from the jsDelivr
          CDN. Those requests happen only on your own website, when you choose to use that code.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Depending on where you live (for example under the GDPR in the EU and UK, or the CCPA in California), you may
          have the right to access, correct or delete personal data about you, or to object to how it’s processed.
          Because we hold almost no personal data, there is usually nothing to return. You can still contact us at{" "}
          <MailLink email={siteConfig.email} /> and we’ll respond within 30 days. You can also block analytics with any
          content blocker without affecting how the tools work.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          {siteConfig.name} is a general-audience site. We don’t knowingly collect personal data from children under 13
          (or under 16 in the EU).
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we change how we handle data, we’ll update this page and the date at the top. See also our{" "}
          <Link href="/terms">Terms of Use</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
