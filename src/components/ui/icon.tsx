import { cn } from "@windmorph/react";

export interface IconProps {
  /** Material Symbols name, e.g. "dashboard", "person", "settings". */
  name: string;
  /** Size in px. Parents that size their icons (IconButton, Button) override it. @default 24 */
  size?: number;
  /** Filled instead of outlined, e.g. for the active navigation item. @default false */
  filled?: boolean;
  /** Stroke weight. @default 400 */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Emphasis: -25 (reduced), 0 (normal), 200 (high). @default 0 */
  grade?: -25 | 0 | 200;
  className?: string;
}

const OPTICAL_SIZES = [20, 24, 40, 48] as const;

function opticalSizeFor(size: number): number {
  return OPTICAL_SIZES.find((opsz) => size <= opsz) ?? 48;
}

/**
 * Material Symbols Rounded icon. Decorative: label the control that contains it instead.
 */
export function Icon({
  name,
  size = 24,
  filled = false,
  weight = 400,
  grade = 0,
  className,
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-rounded select-none leading-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSizeFor(size)}`,
      }}
    >
      {name}
    </span>
  );
}
