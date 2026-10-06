/** Small seeded PRNG (mulberry32), so generated files and values can be reproduced from a seed. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
export const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

/** Fill a buffer with pseudo-random bytes. */
export function randomBytes(rng: Rng, out: Uint8Array): Uint8Array {
  for (let i = 0; i < out.length; i += 4) {
    const v = (rng() * 4294967296) >>> 0;
    out[i] = v & 255;
    if (i + 1 < out.length) out[i + 1] = (v >>> 8) & 255;
    if (i + 2 < out.length) out[i + 2] = (v >>> 16) & 255;
    if (i + 3 < out.length) out[i + 3] = v >>> 24;
  }
  return out;
}

/** A random 32-bit seed, for when the user hasn't fixed one. */
export const newSeed = () => Math.floor(Math.random() * 2 ** 31);
