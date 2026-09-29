import { create } from "zustand";
import { defaultConfig, SvgParseError } from "./engine";
import type { AnimationType, AnimatorConfig, ChannelConfig, SvgModel } from "./engine";
import { loadSvg } from "./lib/sanitize";

export type ChannelName = "stroke" | "fill";

export interface SvgSource {
  /** Sanitized, standalone SVG markup. */
  markup: string;
  model: SvgModel;
  name: string;
  /** Set when the SVG is a built-in sample (so share links can reference it). */
  sampleId: string | null;
}

interface AnimatorState {
  config: AnimatorConfig;
  source: SvgSource | null;
  error: string | null;
  /** Bumps whenever a new SVG loads so the preview can restart. */
  sourceVersion: number;

  setType: (type: AnimationType) => void;
  updateChannel: (channel: ChannelName, patch: Partial<ChannelConfig>) => void;
  setBackground: (background: string) => void;
  setConfig: (config: AnimatorConfig) => void;
  resetConfig: () => void;
  /** Sanitize, parse and load SVG markup. Returns false and sets `error` on failure. */
  loadMarkup: (raw: string, name: string, sampleId?: string) => boolean;
  clearError: () => void;
}

export const useAnimatorStore = create<AnimatorState>()((set) => ({
  config: defaultConfig,
  source: null,
  error: null,
  sourceVersion: 0,

  setType: (type) => set((s) => ({ config: { ...s.config, type } })),
  updateChannel: (channel, patch) =>
    set((s) => ({ config: { ...s.config, [channel]: { ...s.config[channel], ...patch } } })),
  setBackground: (background) => set((s) => ({ config: { ...s.config, background } })),
  setConfig: (config) => set({ config }),
  resetConfig: () => set({ config: defaultConfig }),

  loadMarkup: (raw, name, sampleId) => {
    try {
      const { markup, model } = loadSvg(raw);
      set((s) => ({
        source: { markup, model, name, sampleId: sampleId ?? null },
        error: null,
        sourceVersion: s.sourceVersion + 1,
      }));
      return true;
    } catch (err) {
      const message =
        err instanceof SvgParseError ? err.message : "Could not read that SVG. Check that it is valid SVG markup.";
      set({ error: message });
      return false;
    }
  },
  clearError: () => set({ error: null }),
}));
