"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

// ─── Route label overrides ────────────────────────────────────────────────────

const LABEL_MAP: Record<string, string> = {
  admin: "Settings",
  "org-unit-types": "Unit Types",
  "org-structure": "Hierarchy",
  "org-chart": "Org Chart",
};

function toLabel(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => ({
    label: toLabel(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex items-center gap-1 min-w-0">
        {/* Home crumb */}
        <li className="flex items-center min-w-0">
          {crumbs.length === 0 ? (
            <span
              className="text-[14px] leading-5 font-medium tracking-[0.1px] text-surface-foreground truncate"
              aria-current="page"
            >
              Dashboard
            </span>
          ) : (
            <Link
              href="/dashboard"
              className="text-[14px] leading-5 font-medium tracking-[0.1px] text-surface-variant-foreground truncate transition-colors hover:text-surface-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-xs"
            >
              Dashboard
            </Link>
          )}
        </li>

        {/* Subsequent crumbs */}
        {crumbs.map(({ label, href }, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={href} className="flex items-center gap-1 min-w-0">
              <Icon
                name="chevron_right"
                size={18}
                className="shrink-0 text-outline"
              />
              {isLast ? (
                <span
                  className="text-[14px] leading-5 font-medium tracking-[0.1px] text-surface-foreground truncate"
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="text-[14px] leading-5 font-medium tracking-[0.1px] text-surface-variant-foreground truncate transition-colors hover:text-surface-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-xs"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
