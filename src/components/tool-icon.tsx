import { Code, Image, Palette, PenTool, type LucideProps } from "lucide-react";
import type { ToolIconName } from "@/tools/registry";

const icons = { PenTool, Image, Code, Palette } satisfies Record<ToolIconName, unknown>;

export function ToolIcon({ name, ...props }: { name: ToolIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden {...props} />;
}
