"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AvatarProgressRingProps {
  /** Diameter in px of the avatar the ring should hug (e.g. 32 for `size="sm"`). */
  size?: number;
  /** 0–100 progress; the ring arc fills to this fraction. */
  percent: number;
  /** Ring stroke width in px. */
  strokeWidth?: number;
  className?: string;
}

// Colour ramp around the ring, keyed to progress %. The arc's leading colour
// reflects how far along the import is (red early → green near done).
const RAMP: ReadonlyArray<readonly [number, string]> = [
  [0, "#7f1d1d"], // dark red
  [20, "#ef4444"], // red
  [40, "#ea580c"], // dark orange
  [60, "#eab308"], // yellow
  [80, "#22c55e"], // green
  [100, "#16a34a"], // green
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Interpolated ramp colour at a given progress percent. */
function colorAt(pct: number): string {
  if (pct <= RAMP[0][0]) return RAMP[0][1];
  const last = RAMP[RAMP.length - 1];
  if (pct >= last[0]) return last[1];
  let lo = RAMP[0];
  let hi = last;
  for (let i = 0; i < RAMP.length - 1; i++) {
    if (pct >= RAMP[i][0] && pct <= RAMP[i + 1][0]) {
      lo = RAMP[i];
      hi = RAMP[i + 1];
      break;
    }
  }
  const t = (pct - lo[0]) / (hi[0] - lo[0]);
  const a = hexToRgb(lo[1]);
  const b = hexToRgb(hi[1]);
  const ch = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

/**
 * Tweens a number toward `target` with requestAnimationFrame (easeOutCubic),
 * starting from whatever is currently shown — so repeated target bumps animate
 * smoothly. Honours `prefers-reduced-motion`.
 */
function useAnimatedValue(target: number, duration = 500): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  valueRef.current = value;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = valueRef.current;
    const delta = target - from;
    if (reduce || Math.abs(delta) < 0.1) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + delta * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/**
 * A circular progress ring. The colour ramps dark-red → green and the arc
 * fills from the top clockwise up to `percent`, so the leading tip's colour
 * reflects progress. Rendered as a conic-gradient disc carved into a ring band
 * by a radial mask.
 *
 * Drawn as an absolutely-positioned OVERLAY (`pointer-events-none`) that sits
 * on top of an avatar/button sibling and hugs its edge. Decorative only
 * (aria-hidden) — announce progress elsewhere.
 */
export function AvatarProgressRing({
  size = 32,
  percent,
  strokeWidth = 4,
  className,
}: AvatarProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  // Smoothly animate the reveal as progress changes (CSS masks can't transition).
  const animated = useAnimatedValue(clamped);
  // Box is bigger than the avatar; the ring band sits at the box edge so its
  // inner edge lands on the avatar edge.
  const box = size + strokeWidth * 3;

  // Conic background: the colour ramp from 0→animated, then a HARD transparent
  // cut for the unfilled remainder (track shows through). Including the exact
  // interpolated colour at the cut avoids a fade to transparent.
  const stops: string[] = [];
  for (const [pos, color] of RAMP) {
    if (pos < animated) stops.push(`${color} ${pos}%`);
  }
  stops.push(`${colorAt(animated)} ${animated}%`);
  stops.push(`transparent ${animated}%`, `transparent 100%`);
  const ramp = `conic-gradient(from 0deg, ${stops.join(", ")})`;

  // Radial mask: keep only the outer `strokeWidth` band → disc becomes a ring.
  const maskRing = `radial-gradient(farthest-side, transparent calc(100% - ${strokeWidth}px), #000 calc(100% - ${strokeWidth}px))`;

  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    WebkitMask: maskRing,
    mask: maskRing,
  };

  return (
    <div
      className={cn("absolute pointer-events-none", className)}
      // inset+margin:auto centers this fixed-size overlay in the relative
      // wrapper regardless of the button's size.
      style={{ width: box, height: box, inset: 0, margin: "auto" }}
      aria-hidden="true"
    >
      {/* Faint full-circle track */}
      <div style={{ ...layer, background: "hsl(var(--outline-variant))", opacity: 0.3 }} />
      {/* Colour ramp, revealed 0→percent */}
      <div style={{ ...layer, background: ramp }} />
    </div>
  );
}
