"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so it can't rely on globals.css or the theme provider.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "0 auto", padding: "80px 16px", colorScheme: "light dark" }}>
        <title>Something went wrong | Vartula</title>
        <h1 style={{ fontSize: 30 }}>Something went wrong</h1>
        <p>Vartula hit an unexpected error. Your files never left your browser.</p>
        <p style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
          {/* A full reload is intentional: the root layout itself failed. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">All tools</a>
        </p>
      </body>
    </html>
  );
}
