"use client";

import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  // Read the initial preference with a lazy initializer (SSR-safe) instead of
  // a synchronous setState in the effect body. The effect only subscribes to
  // changes, updating state from the event callback.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reducedMotion;
}
