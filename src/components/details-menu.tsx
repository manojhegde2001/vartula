"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A native <details> dropdown that also closes on an outside click, Escape or a link click.
 * Used in site chrome instead of a Base UI menu so the home page stays free of Base UI.
 */
export function DetailsMenu({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (focusSummary: boolean) => {
      const details = ref.current;
      if (!details?.open) return;
      details.open = false;
      if (focusSummary) details.querySelector("summary")?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details
      ref={ref}
      className={className}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a") && ref.current) ref.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
