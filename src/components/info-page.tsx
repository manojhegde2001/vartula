import type { ReactNode } from "react";
import { infoPage, type InfoPath } from "@/lib/pages";

/** Long-form layout shared by About, Contact, Privacy and Terms. */
export function InfoPage({ path, intro, children }: { path: InfoPath; intro: ReactNode; children: ReactNode }) {
  const page = infoPage(path);
  const updated = new Date(`${page.updated}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.name}</h1>
        <p className="text-lg text-muted-foreground">{intro}</p>
        <p className="text-sm text-muted-foreground">
          Last updated <time dateTime={page.updated}>{updated}</time>
        </p>
      </header>
      <div className="space-y-8 leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:mt-1.5 [&_p+p]:mt-3 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

export function MailLink({ email }: { email: string }) {
  return <a href={`mailto:${email}`}>{email}</a>;
}
