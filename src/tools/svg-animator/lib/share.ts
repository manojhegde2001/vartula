import { normalizeConfig } from "../engine";
import type { AnimatorConfig } from "../engine";

/**
 * Shareable state in the URL hash: `#c=<base64url JSON config>&s=<sample id>`.
 * The SVG itself is not included (it can be megabytes); built-in samples are
 * referenced by id so shared links reproduce them.
 */
export interface SharedState {
  config: AnimatorConfig | null;
  sampleId: string | null;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  // Also accept standard base64 (URLSearchParams turns "+" into " ").
  const b64 = value.replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeShareHash(config: AnimatorConfig, sampleId?: string | null): string {
  const params = new URLSearchParams();
  params.set("c", toBase64Url(JSON.stringify(config)));
  if (sampleId) params.set("s", sampleId);
  return params.toString();
}

/** Parse a location hash (with or without "#"). Invalid parts are ignored. */
export function decodeShareHash(hash: string): SharedState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  let config: AnimatorConfig | null = null;
  const raw = params.get("c");
  if (raw) {
    try {
      config = normalizeConfig(JSON.parse(fromBase64Url(raw)));
    } catch {
      config = null;
    }
  }
  const s = params.get("s");
  return { config, sampleId: s && /^[a-z0-9-]{1,40}$/.test(s) ? s : null };
}
