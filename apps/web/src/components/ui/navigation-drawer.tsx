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
 * @see https://m3.material.io/components/navigation-drawer/specs
 *
 * Specs:
 * - Width: 360px (standard)
 * - Container shape: 0 start, 16px end (rounded-r-2xl when from left)
 * - Background: surface-container-low (mapped to surface)
 * - Elevation: Level 1 (standard), Level 0 (modal)
 * - Header: 56px area for branding
 * - Nav item height: 56px
 * - Nav item shape: rounded-full (28px radius pill)
 * - Nav item padding: 16px start, 24px end
 * - Active indicator: secondary-container fill
 * - Active text/icon: on-secondary-container, icon filled
 * - Inactive text/icon: on-surface-variant, icon outlined
 * - Section header: Label Small (14px), on-surface-variant, 36px height
 * - Divider between sections: outline-variant, 16px margin
 * - Content padding: 12px horizontal
 */
export function NavigationDrawer({
  sections,
  header,
  onNavigate,
  className,
}: NavigationDrawerProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-r-2xl bg-surface-variant",
        className
      )}
    >
      {/* Header */}
      {header && (
        <div className="flex items-center h-14 px-7 shrink-0">
          {header}
        </div>
      )}

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Navigation drawer">
        {sections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section divider */}
            {sectionIndex > 0 && (
              <div className="py-4 px-4">
                <Divider />
              </div>
            )}

            {/* Section header */}
            <p className="px-4 pt-2 pb-2 text-[14px] leading-5 font-medium text-surface-variant-foreground">
              {section.title}
            </p>

            {/* Nav items */}
            <ul className="space-y-1 mt-1">
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
                        "group flex items-center gap-3 rounded-full h-14 px-4 pr-6 transition-colors duration-200 relative",
                        isActive
                          ? "bg-secondary-container text-secondary-container-foreground font-medium"
                          : "text-surface-variant-foreground"
                      )}
                    >
                      {/* State layer */}
                      <div
                        className={cn(
                          "absolute inset-0 rounded-full transition-colors duration-200",
                          isActive
                            ? "group-hover:bg-secondary-container-foreground/8 group-active:bg-secondary-container-foreground/12"
                            : "group-hover:bg-surface-foreground/8 group-active:bg-surface-foreground/12"
                        )}
                      />
                      <Icon
                        name={item.icon}
                        size={24}
                        filled={isActive}
                        className="shrink-0 relative z-10"
                      />
                      <span className="text-[14px] leading-5 whitespace-nowrap truncate relative z-10">
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
