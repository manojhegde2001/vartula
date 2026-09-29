import { describe, expect, it } from "vitest";
import { defaultConfig } from "../engine";
import type { AnimatorConfig } from "../engine";
import { decodeShareHash, encodeShareHash } from "./share";

const custom: AnimatorConfig = {
  type: "animation",
  stroke: { enabled: true, duration: 2345, delay: 10, stagger: 77, easing: "easeOutBack", direction: "alternate" },
  fill: { enabled: false, duration: 100, delay: 0, stagger: 0, easing: "linear", direction: "reverse" },
  background: "transparent",
};

describe("share hash", () => {
  it("round-trips config and sample id", () => {
    const hash = encodeShareHash(custom, "rocket");
    // URL-safe payload: no characters that need escaping in a hash.
    expect(new URLSearchParams(hash).get("c")).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShareHash(`#${hash}`)).toEqual({ config: custom, sampleId: "rocket" });
  });

  it("omits the sample id when not using a sample", () => {
    expect(decodeShareHash(encodeShareHash(defaultConfig))).toEqual({ config: defaultConfig, sampleId: null });
  });

  it("round-trips non-ASCII colors safely", () => {
    const withColor = { ...defaultConfig, background: "hsl(200 50% 50%)" };
    expect(decodeShareHash(encodeShareHash(withColor)).config?.background).toBe("hsl(200 50% 50%)");
  });

  it("ignores garbage and normalizes hostile values", () => {
    expect(decodeShareHash("#c=%%%not-base64")).toEqual({ config: null, sampleId: null });
    expect(decodeShareHash("")).toEqual({ config: null, sampleId: null });
    expect(decodeShareHash("#s=../../etc").sampleId).toBeNull();
    const hostile = btoa(JSON.stringify({ background: "red;}</style><script>", stroke: { duration: "1e99" } }));
    const decoded = decodeShareHash(`#c=${hostile}`).config!;
    expect(decoded.background).toBe(defaultConfig.background);
    expect(decoded.stroke.duration).toBe(600_000);
  });
});
