"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnimatorStore } from "../store";

// The dialog (and, from it, mediabunny / gifenc / fflate) loads only when first opened.
const ExportDialog = dynamic(() => import("./export-dialog"), { ssr: false });

export function MediaExportButton() {
  const hasSource = useAnimatorStore((s) => s.source !== null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        disabled={!hasSource}
      >
        <Film /> Export video / GIF
      </Button>
      {mounted && <ExportDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
