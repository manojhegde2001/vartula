import type { OutputFormat } from "./formats";
import type { ResizeSettings } from "./resize";

export * from "./formats";
export * from "./resize";
export * from "./target-size";

export interface ConvertSettings {
  format: OutputFormat;
  /** 1–100. For a target size this is the highest quality tried. */
  quality: number;
  resize: ResizeSettings;
  /** Byte budget in KB (1000 bytes), or null for no limit. */
  targetKb: number | null;
  /** Fill behind transparent pixels when the format has no alpha channel (JPG). */
  background: string;
}

export const defaultSettings: ConvertSettings = {
  format: "jpeg",
  quality: 82,
  resize: { mode: "none", percent: 50, width: 1920, height: null },
  targetKb: null,
  background: "#ffffff",
};

/** Target-size presets offered as one-click chips; common upload limits on forms and portals. */
export const targetPresets = [20, 50, 100, 200, 500, 1000];
