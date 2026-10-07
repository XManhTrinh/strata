"use client";

import { cn } from "./lib/utils";

export type IconProps = {
  /** Material Symbols icon name (e.g., "dashboard", "person", "settings") */
  name: string;
  /**
   * Size in pixels. Defaults to 24 (M3 standard).
   * When used inside a parent that controls icon sizing (e.g., IconButton),
   * the parent's size classes will override this value via CSS specificity.
   * Supports any number, not just the predefined optical sizes.
   */
  size?: number;
  /** Additional classes */
  className?: string;
  /** Whether the icon is filled (default: false for outlined style) */
  filled?: boolean;
  /** Font weight for the icon (default: 400) */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Grade for emphasis: -25 (reduce), 0 (normal), 200 (high emphasis) */
  grade?: -25 | 0 | 200;
  /**
   * Optical size — controls how thick/thin strokes appear at different sizes.
   * Defaults to matching the `size` prop. M3 recommended values: 20, 24, 40, 48.
   * Smaller opsz = thicker strokes (for small rendering). Larger = thinner strokes.
   */
  opticalSize?: 20 | 24 | 40 | 48;
}

/**
 * Material Symbols icon component (M3 Expressive).
 *
 * Uses the Material Symbols Rounded variable font (M3 default style).
 * Fully supports all Material Symbols variable font axes:
 * - FILL: 0 (outlined) or 1 (filled) — used for active state transitions
 * - wght: 100–700 — icon stroke weight
 * - GRAD: -25, 0, or 200 — emphasis/grade adjustment
 * - opsz: 20, 24, 40, 48 — optical size optimization
 *
 * When placed inside a parent component (e.g., IconButton, Button, FAB),
 * the parent controls the rendered size via CSS (`[&_.material-symbols-rounded]:text-[Xpx]`).
 * The `size` prop here acts as a default that parents can override.
 *
 * @example
 * ```tsx
 * <Icon name="favorite" />
 * <Icon name="favorite" filled />
 * <Icon name="home" size={20} weight={300} />
 * <Icon name="star" filled grade={200} />
 * ```
 *
 * @see https://fonts.google.com/icons for available icon names
 */
export function Icon({
  name,
  size = 24,
  className,
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize,
}: IconProps) {
  // Optical size defaults to the nearest M3 recommended value
  const opsz = opticalSize ?? (size <= 20 ? 20 : size <= 24 ? 24 : size <= 40 ? 40 : 48);

  return (
    <span
      className={cn(
        "material-symbols-rounded select-none leading-none",
        className
      )}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opsz}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

Icon.displayName = "Icon";
