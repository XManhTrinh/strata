"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Material Design 3 Ripple Effect
 *
 * CSS-based ripple using ::after pseudo-element with radial gradient animation.
 * Wrap any interactive element to add M3 touch feedback.
 *
 * Usage:
 *   <Ripple><button>Click me</button></Ripple>
 *
 * Or use the `useRipple` hook for manual control on existing elements.
 *
 * M3 Spec:
 * - Ripple color: on-surface at 12% opacity (press state layer)
 * - Ripple expands from touch/click point
 * - Duration: 300ms expand, 200ms fade
 */

interface RippleEvent {
  x: number;
  y: number;
  size: number;
  id: number;
}

let rippleId = 0;

export function useRipple() {
  const [ripples, setRipples] = React.useState<RippleEvent[]>([]);
  const containerRef = React.useRef<HTMLElement>(null);

  const trigger = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: RippleEvent = { x, y, size, id: rippleId++ };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 500);
  }, []);

  return { ripples, trigger, containerRef };
}

export interface RippleContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether ripple is disabled */
  disabled?: boolean;
}

/**
 * Wrapper that adds M3 ripple effect to its child.
 * Must contain a single interactive element.
 */
const RippleContainer = React.forwardRef<HTMLDivElement, RippleContainerProps>(
  ({ className, children, disabled, ...props }, ref) => {
    const { ripples, trigger, containerRef } = useRipple();

    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref, containerRef]
    );

    return (
      <div
        ref={mergedRef}
        className={cn("relative overflow-hidden", className)}
        onMouseDown={disabled ? undefined : trigger}
        onTouchStart={disabled ? undefined : trigger}
        {...props}
      >
        {children}
        {/* Ripple circles */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-surface-foreground/12 animate-[ripple_500ms_ease-out_forwards] pointer-events-none"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </div>
    );
  }
);
RippleContainer.displayName = "RippleContainer";

export { RippleContainer };
