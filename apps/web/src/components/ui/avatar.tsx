"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Color utils ──────────────────────────────────────────────────────────────

function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  s: "h-8 w-8 text-[12px]",
  m: "h-10 w-10 text-[14px]",
  l: "h-12 w-12 text-[16px]",
  xl: "h-16 w-16 text-[20px]",
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string;
  /** Person's name (used for initials fallback + color generation) */
  name?: string;
  /** Alt text for image */
  alt?: string;
  /** Size */
  size?: "xs" | "s" | "m" | "l" | "xl";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, alt, size = "m", className, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);
    const showImage = src && !imgError;

    // Derive initials and color from name
    const initials = name ? getInitials(name) : "?";
    const hue = name ? stringToHue(name) : 0;
    const bgColor = name ? `hsl(${hue}, 60%, 90%)` : undefined;
    const textColor = name ? `hsl(${hue}, 55%, 40%)` : undefined;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none",
          sizeClasses[size],
          !showImage && !name && "bg-surface-variant text-surface-variant-foreground",
          className
        )}
        style={!showImage && name ? { backgroundColor: bgColor, color: textColor } : undefined}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt ?? name ?? "Avatar"}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

// ─── AvatarGroup (Cascading) ──────────────────────────────────────────────────

const overlapMap = { xs: -4, s: -6, m: -8, l: -10, xl: -12 } as const;

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max avatars to show before "+N" */
  max?: number;
  /** Size applied to all avatars */
  size?: "xs" | "s" | "m" | "l" | "xl";
  /** Custom overlap in px (negative) */
  spacing?: number;
}

function AvatarGroup({
  max,
  size = "m",
  spacing,
  className,
  children,
  ...props
}: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const total = avatars.length;
  const overflow = max && total > max ? total - max : 0;
  const visible = max ? avatars.slice(0, max) : avatars;
  const overlap = spacing ?? overlapMap[size];

  return (
    <div className={cn("flex items-center", className)} {...props}>
      {visible.map((child, i) => (
        <div
          key={i}
          className="ring-2 ring-background rounded-full"
          style={{
            marginLeft: i === 0 ? 0 : `${overlap}px`,
            zIndex: total - i,
          }}
        >
          {React.isValidElement<AvatarProps>(child)
            ? React.cloneElement(child, { size })
            : child}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-surface-variant text-surface-variant-foreground font-medium ring-2 ring-background",
            sizeClasses[size]
          )}
          style={{ marginLeft: `${overlap}px`, zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
AvatarGroup.displayName = "AvatarGroup";

export { Avatar, AvatarGroup };
