"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-20">
      <title>Something went wrong | Vartula</title>
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit an unexpected error. Your files never left your browser. Try again, or go back to the tools.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={() => retry()} className={buttonVariants()}>
          Try again
        </button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          All tools
        </Link>
      </div>
    </div>
  );
}
