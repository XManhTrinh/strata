import { cn } from "@/lib/utils";

export interface IconProps {
  /** Material Symbols icon name (e.g., "dashboard", "person", "settings") */
  name: string;
  /** Size in pixels. Defaults to 24 (M3 standard) */
  size?: 18 | 20 | 24 | 40 | 48;
  /** Additional classes */
  className?: string;
  /** Whether the icon is filled (default: false for outlined style) */
  filled?: boolean;
}

/**
 * Material Symbols icon component.
 * Uses the Material Symbols Rounded font variant (M3 default).
 *
 * @see https://fonts.google.com/icons for available icon names
 */
export function Icon({ name, size = 24, className, filled = false }: IconProps) {
  return (
    <span
      className={cn(
        "material-symbols-rounded select-none",
        className
      )}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
