"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Divider } from "@/components/ui/divider";

export interface NavigationDrawerItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Material Symbols icon name */
  icon: string;
}

export interface NavigationDrawerSection {
  /** Section header title */
  title: string;
  /** Items in this section */
  items: NavigationDrawerItem[];
}

export interface NavigationDrawerProps {
  /** Grouped navigation sections */
  sections: NavigationDrawerSection[];
  /** Header content (e.g. brand name) */
  header?: React.ReactNode;
  /** Callback when a nav item is clicked (for closing mobile drawer) */
  onNavigate?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Material Design 3 Navigation Drawer
 *
 * Full navigation drawer showing all items grouped into sections.
 * Used inside a Sheet for the mobile modal variant.
 *
 * @see https://m3.material.io/components/navigation-drawer
 *
 * Specs:
 * - Width: 360px (standard), full screen on mobile as modal
 * - Background: surface (surface-container-low)
 * - Header: 56px area for branding
 * - Nav item height: 56px
 * - Nav item shape: rounded-full (28px radius pill)
 * - Active: secondary-container fill, on-secondary-container text, filled icon
 * - Inactive: transparent, on-surface-variant, outlined icon
 * - Padding: 12px horizontal (items have 16px internal padding)
 * - Section headers: Title Small (14px), on-surface-variant
 * - Divider between sections
 */
export function NavigationDrawer({
  sections,
  header,
  onNavigate,
  className,
}: NavigationDrawerProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      {header && (
        <div className="flex items-center h-14 px-7 shrink-0">
          {header}
        </div>
      )}

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Navigation drawer">
        {sections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section divider */}
            {sectionIndex > 0 && (
              <div className="py-2 px-1">
                <Divider />
              </div>
            )}

            {/* Section header */}
            <p className="px-4 pt-4 pb-1 text-[14px] leading-5 font-medium text-surface-variant-foreground">
              {section.title}
            </p>

            {/* Nav items */}
            <ul className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-full h-14 px-4 transition-colors duration-200",
                        isActive
                          ? "bg-secondary-container text-secondary-container-foreground font-medium"
                          : "text-surface-variant-foreground hover:bg-surface-foreground/8"
                      )}
                    >
                      <Icon
                        name={item.icon}
                        size={24}
                        filled={isActive}
                        className="shrink-0"
                      />
                      <span className="text-[14px] leading-5 whitespace-nowrap truncate">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
