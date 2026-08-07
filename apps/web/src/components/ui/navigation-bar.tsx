"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

export interface NavigationBarItem {
  /** Display label */
  label: string;
  /** Route path */
  href?: string;
  /** Material Symbols icon name */
  icon: string;
  /** Click handler (alternative to href, e.g. for "More" button) */
  onClick?: () => void;
}

export interface NavigationBarProps {
  /** Navigation destinations (3-5 max per M3 spec) */
  items: NavigationBarItem[];
  /** Additional className */
  className?: string;
}

/**
 * Material Design 3 Navigation Bar
 *
 * Bottom navigation for mobile viewports. Shows 3-5 destinations with
 * icon + label. Active state uses a pill-shaped indicator with
 * secondary-container fill.
 *
 * @see https://m3.material.io/components/navigation-bar
 *
 * Specs:
 * - Position: fixed bottom
 * - Height: 80px
 * - Background: surface (surface-container equivalent)
 * - Active indicator: pill 64×32px, secondary-container
 * - Active icon: filled, on-secondary-container
 * - Inactive icon: outlined, on-surface-variant
 * - Label: 12px/16px, weight 500
 * - Touch target: full width of item, 80px tall
 */
export function NavigationBar({ items, className }: NavigationBarProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 h-20 bg-surface md:hidden",
        "shadow-[0_-1px_3px_0_hsl(var(--elevation-1))]",
        className
      )}
      aria-label="Bottom navigation"
    >
      <ul className="flex h-full items-center justify-around">
        {items.map((item) => {
          const isActive = item.href
            ? item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            : false;

          const content = (
            <div className="flex flex-col items-center justify-center gap-1 w-full h-20">
              {/* Active indicator pill */}
              <div
                className={cn(
                  "flex items-center justify-center w-16 h-8 rounded-full transition-colors duration-200",
                  isActive ? "bg-secondary-container" : "bg-transparent"
                )}
              >
                <Icon
                  name={item.icon}
                  size={24}
                  filled={isActive}
                  className={cn(
                    isActive
                      ? "text-secondary-container-foreground"
                      : "text-surface-variant-foreground"
                  )}
                />
              </div>
              {/* Label */}
              <span
                className={cn(
                  "text-[12px] leading-4 font-medium",
                  isActive
                    ? "text-secondary-container-foreground"
                    : "text-surface-variant-foreground"
                )}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.onClick && !item.href) {
            return (
              <li key={item.label} className="flex-1">
                <button
                  onClick={item.onClick}
                  className="flex w-full items-center justify-center"
                  aria-label={item.label}
                >
                  {content}
                </button>
              </li>
            );
          }

          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href ?? "/"}
                className="flex w-full items-center justify-center"
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
