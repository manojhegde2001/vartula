"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { applyFrame, collectDrawables, getFrameState, loopDuration } from "../engine";
import { defaultSample } from "../samples";
import { useAnimatorStore } from "../store";
import { cn } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Live preview. Every frame is computed by getFrameState and written with
 * applyFrame — the same engine calls used for code and video export.
 */
export function Preview({ className }: { className?: string }) {
  const source = useAnimatorStore((s) => s.source);
  const config = useAnimatorStore((s) => s.config);
  const sourceVersion = useAnimatorStore((s) => s.sourceVersion);

  const hostRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Element[]>([]);
  // Playback clock: while playing, time = now - origin; while paused, time is frozen.
  const timeRef = useRef(0);
  const originRef = useRef(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [time, setTime] = useState(0);

  const duration = source ? loopDuration(config, source.model) : 0;

  const draw = useCallback(
    (t: number) => {
      if (!source) return;
      applyFrame(elementsRef.current, getFrameState(config, source.model, t));
      timeRef.current = t;
      setTime(t);
    },
    [config, source],
  );

  // Mount the sanitized SVG and restart whenever a new one loads.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !source) return;
    host.innerHTML = source.markup; // sanitized by DOMPurify in loadSvg()
    const svg = host.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Animated preview of ${source.name}`);
    svg.style.display = "block";
    elementsRef.current = collectDrawables(svg);
    timeRef.current = 0;
    originRef.current = performance.now();
  }, [source, sourceVersion]);

  // Animation loop (or a single draw while paused).
  useEffect(() => {
    if (!source) return;
    if (!playing) {
      const id = requestAnimationFrame(() => draw(timeRef.current));
      return () => cancelAnimationFrame(id);
    }
    originRef.current = performance.now() - timeRef.current;
    let id = 0;
    const tick = () => {
      let t = performance.now() - originRef.current;
      if (config.type === "transition") {
        if (t >= duration) {
          draw(duration);
          setPlaying(false);
          return;
        }
      } else if (duration > 0) {
        t %= duration;
      }
      draw(t);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, draw, duration, config.type, source]);

  const togglePlay = () => {
    if (!playing && config.type === "transition" && timeRef.current >= duration) timeRef.current = 0;
    setPlaying((p) => !p);
  };

  const restart = () => {
    timeRef.current = 0;
    originRef.current = performance.now();
    draw(0);
    setPlaying(true);
  };

  const seek = (t: number) => {
    setPlaying(false);
    draw(Math.min(Math.max(t, 0), duration));
  };

  const transparent = config.background === "transparent";

  return (
    <div className={className}>
      <div
        className={cn(
          "relative aspect-[4/3] max-h-[60dvh] min-h-64 w-full overflow-hidden lg:aspect-auto lg:max-h-none lg:min-h-0 lg:flex-1",
          transparent && "bg-checkerboard",
        )}
        style={transparent ? undefined : { background: config.background }}
      >
        <div ref={hostRef} data-testid="preview" className="absolute inset-4" />
        {!source && (
          // Server-rendered poster (a trusted built-in sample) so the preview isn't empty before hydration.
          <div
            role="img"
            aria-label={`${defaultSample.name} SVG line-drawing preview`}
            className="absolute inset-4 [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: defaultSample.markup }}
          />
        )}
      </div>

      <div className="flex items-center gap-2 border-t p-2">
        <Button
          size="icon"
          variant="outline"
          onClick={togglePlay}
          disabled={!source}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button size="icon" variant="outline" onClick={restart} disabled={!source} aria-label="Restart">
          <RotateCcw />
        </Button>
        <Slider
          aria-label="Timeline"
          className="mx-2 flex-1"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={Math.min(time, duration)}
          disabled={!source}
          onValueChange={(v) => seek(v as number)}
        />
        <span className="pr-1 text-right font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {formatSeconds(Math.min(time, duration))} / {formatSeconds(duration)}
        </span>
      </div>
    </div>
  );
}
