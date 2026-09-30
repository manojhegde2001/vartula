"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Check, ChevronDown, Code, Download, Film, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { encodeShareHash } from "../lib/share";
import { useAnimatorStore } from "../store";

// The dialog (and, from it, mediabunny / gifenc / fflate) loads only when first opened.
const ExportDialog = dynamic(() => import("./export-dialog"), { ssr: false });

/** Anchor of the code export panel, used by the menu's "Code" item. */
export const CODE_SECTION_ID = "export-code";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const { config, source } = useAnimatorStore.getState();
    const url = `${window.location.origin}${window.location.pathname}#${encodeShareHash(config, source?.sampleId)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="sm" onClick={share} aria-label="Copy link" title="Copy a link to these settings">
      {copied ? <Check /> : <Link2 />} <span className="max-md:hidden">{copied ? "Copied" : "Copy link"}</span>
    </Button>
  );
}

export function ExportMenu() {
  const hasSource = useAnimatorStore((s) => s.source !== null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const showCode = () => {
    const section = document.getElementById(CODE_SECTION_ID);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus({ preventScroll: true });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" disabled={!hasSource} />}>
          <Download /> Export <ChevronDown className="opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem
            onClick={() => {
              setMounted(true);
              setOpen(true);
            }}
          >
            <Film />
            <div>
              <p className="font-medium">Video / GIF</p>
              <p className="text-xs text-muted-foreground">MP4, WebM, GIF or PNG frames</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={showCode}>
            <Code />
            <div>
              <p className="font-medium">Code</p>
              <p className="text-xs text-muted-foreground">CSS, SMIL, React, JavaScript, GSAP</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {mounted && <ExportDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
