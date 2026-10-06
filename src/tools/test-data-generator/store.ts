"use client";

import { create } from "zustand";
import { fieldTypes, defaultOptions, type FieldTypeId } from "./engine/fields";
import { dataFormats, defaultFormatOptions, type FormatOptions } from "./engine/formats";
import { locales, type LocaleId } from "./engine/locales";
import { field, fieldId, presets, type FieldSpec } from "./engine/records";
import { newSeed } from "./engine/rng";

export const TABS = ["data", "files", "edge", "values"] as const;
export type Tab = (typeof TABS)[number];

/** Largest dataset; at roughly 200 bytes a row this is a couple of hundred MB. */
export const MAX_ROWS = 1_000_000;

interface DataState {
  tab: Tab;
  setTab: (tab: Tab) => void;
  fields: FieldSpec[];
  count: number;
  format: FormatOptions;
  locale: LocaleId;
  seed: number;
  presetId: string;

  updateField: (id: string, patch: Partial<FieldSpec>) => void;
  setFieldType: (id: string, type: FieldTypeId) => void;
  addField: () => void;
  removeField: (id: string) => void;
  moveField: (id: string, delta: number) => void;
  loadPreset: (id: string) => void;
  setCount: (count: number) => void;
  setFormat: (patch: Partial<FormatOptions>) => void;
  setLocale: (locale: LocaleId) => void;
  setSeed: (seed: number) => void;
  reseed: () => void;
  loadShared: (shared: SharedSpec) => void;
}

const initial = presets[0];

export const useDataStore = create<DataState>()((set) => ({
  tab: "data",
  setTab: (tab) => set({ tab }),
  fields: initial.fields(),
  count: 100,
  format: { ...defaultFormatOptions, table: initial.table },
  locale: "en_US",
  seed: 20260101,
  presetId: initial.id,

  updateField: (id, patch) => set((s) => ({ fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
  setFieldType: (id, type) => set((s) => ({ fields: s.fields.map((f) => (f.id === id ? { ...f, type, options: defaultOptions(type) } : f)) })),
  addField: () =>
    set((s) => {
      let n = s.fields.length + 1;
      while (s.fields.some((f) => f.name === `field_${n}`)) n++;
      return { fields: [...s.fields, field(`field_${n}`, "word")] };
    }),
  removeField: (id) => set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),
  moveField: (id, delta) =>
    set((s) => {
      const from = s.fields.findIndex((f) => f.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= s.fields.length) return {};
      const fields = [...s.fields];
      const [f] = fields.splice(from, 1);
      fields.splice(to, 0, f);
      return { fields };
    }),
  loadPreset: (id) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    set((s) => ({ fields: p.fields(), presetId: id, format: { ...s.format, table: p.table }, locale: p.locale ?? s.locale }));
  },
  setCount: (count) => set({ count: Math.max(1, Math.min(MAX_ROWS, Math.round(count) || 1)) }),
  setFormat: (patch) => set((s) => ({ format: { ...s.format, ...patch } })),
  setLocale: (locale) => set({ locale }),
  setSeed: (seed) => set({ seed: Math.max(0, Math.floor(seed) || 0) }),
  reseed: () => set({ seed: newSeed() }),
  loadShared: (shared) =>
    set((s) => ({
      fields: shared.fields.map((f) => ({ ...f, id: fieldId() })),
      count: Math.max(1, Math.min(MAX_ROWS, shared.count)),
      format: { ...s.format, ...shared.format },
      locale: shared.locale,
      seed: shared.seed,
      presetId: "",
    })),
}));

// ---- Share links (#data=…) ----

export interface SharedSpec {
  fields: Omit<FieldSpec, "id">[];
  count: number;
  format: FormatOptions;
  locale: LocaleId;
  seed: number;
}

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function encodeShare(s: Pick<DataState, "fields" | "count" | "format" | "locale" | "seed">): string {
  const spec: SharedSpec = { fields: s.fields.map((f) => ({ name: f.name, type: f.type, options: f.options, blank: f.blank, unique: f.unique, list: f.list })), count: s.count, format: s.format, locale: s.locale, seed: s.seed };
  return toBase64Url(new TextEncoder().encode(JSON.stringify(spec)));
}

/** Parse a shared spec, dropping anything malformed rather than trusting the link. */
export function decodeShare(text: string): SharedSpec | null {
  try {
    const raw = JSON.parse(new TextDecoder().decode(fromBase64Url(text))) as Partial<SharedSpec>;
    if (!Array.isArray(raw.fields)) return null;
    const fields = raw.fields
      .filter((f): f is Omit<FieldSpec, "id"> => !!f && typeof f.name === "string" && typeof f.type === "string" && f.type in fieldTypes)
      .map((f) => ({
        name: f.name.slice(0, 200),
        type: f.type,
        options: { ...defaultOptions(f.type), ...(typeof f.options === "object" && f.options ? f.options : {}) },
        blank: Math.max(0, Math.min(100, Number(f.blank) || 0)),
        unique: !!f.unique,
        list: Math.max(0, Math.min(20, Number(f.list) || 0)),
      }));
    const locale = locales.some((l) => l.id === raw.locale) ? (raw.locale as LocaleId) : "en_US";
    return {
      fields,
      count: Number(raw.count) || 100,
      format: validFormat({ ...defaultFormatOptions, ...(raw.format ?? {}) }),
      locale,
      seed: Number(raw.seed) || 1,
    };
  } catch {
    return null;
  }
}

function validFormat(f: FormatOptions): FormatOptions {
  return {
    ...f,
    format: dataFormats.some((d) => d.id === f.format) ? f.format : "json",
    dialect: ["postgres", "mysql", "sqlite"].includes(f.dialect) ? f.dialect : "postgres",
    table: String(f.table).slice(0, 100),
  };
}
