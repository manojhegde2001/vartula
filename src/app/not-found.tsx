import type { Metadata } from "next";
import Link from "next/link";
import { toolPath, tools } from "@/tools/registry";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        That page doesn’t exist. It may have moved, or the link may be mistyped. Try one of the tools instead:
      </p>
      <ul className="space-y-2">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link href={toolPath(tool.slug)} className="font-medium underline-offset-4 hover:underline">
              {tool.name}
            </Link>
            <span className="text-muted-foreground"> — {tool.description}</span>
          </li>
        ))}
        <li>
          <Link href="/" className="font-medium underline-offset-4 hover:underline">
            All tools
          </Link>
        </li>
      </ul>
    </div>
  );
}
