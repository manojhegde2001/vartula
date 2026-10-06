/**
 * Squeeze an image under a byte budget. Lowers quality first (lossy formats), then shrinks the
 * dimensions and searches again. The encoder is injected so this stays pure and testable.
 */

export interface Encoded {
  size: number;
}

export interface FitOptions {
  /** Byte budget. */
  target: number;
  /** Highest quality to try (0–1); the search never goes above it. */
  maxQuality: number;
  /** Whether quality affects size (false for PNG, which can only shrink by resizing). */
  lossy: boolean;
  /** Lowest quality worth using before shrinking the image instead. */
  minQuality?: number;
  /** Output width at scale 1, to stop shrinking at a sensible minimum. */
  width: number;
  height: number;
}

export interface FitResult<T extends Encoded> {
  result: T;
  quality: number;
  scale: number;
  /** False when even the smallest attempt is still over budget. */
  met: boolean;
}

const QUALITY_STEPS = 7;
const MAX_ROUNDS = 8;
const MIN_SIDE = 16;

export async function fitToSize<T extends Encoded>(
  encode: (quality: number, scale: number) => Promise<T>,
  { target, maxQuality, lossy, minQuality = 0.3, width, height }: FitOptions,
): Promise<FitResult<T>> {
  let scale = 1;
  let smallest: FitResult<T> | null = null;
  const lowQ = Math.min(minQuality, maxQuality);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const top = await encode(maxQuality, scale);
    if (top.size <= target) return { result: top, quality: maxQuality, scale, met: true };
    let floor = top;
    let floorQ = maxQuality;

    if (lossy && lowQ < maxQuality) {
      const bottom = await encode(lowQ, scale);
      floor = bottom;
      floorQ = lowQ;
      if (bottom.size <= target) {
        // Binary search for the highest quality that fits.
        let lo = lowQ;
        let hi = maxQuality;
        let best: FitResult<T> = { result: bottom, quality: lowQ, scale, met: true };
        for (let i = 0; i < QUALITY_STEPS; i++) {
          const q = (lo + hi) / 2;
          const attempt = await encode(q, scale);
          if (attempt.size <= target) {
            best = { result: attempt, quality: q, scale, met: true };
            lo = q;
          } else {
            hi = q;
          }
        }
        return best;
      }
    }

    if (!smallest || floor.size < smallest.result.size) smallest = { result: floor, quality: floorQ, scale, met: false };

    // File size scales roughly with pixel count, so shrink both sides by the square root of the overshoot.
    const next = scale * Math.sqrt(target / floor.size) * 0.92;
    const minScale = Math.min(1, MIN_SIDE / Math.max(1, Math.min(width, height)));
    if (scale <= minScale) break;
    scale = Math.max(minScale, Math.min(next, scale * 0.9));
  }

  return smallest!;
}
