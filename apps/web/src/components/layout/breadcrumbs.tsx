"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-on-surface-variant">
          <li className="font-medium text-on-surface">Dashboard</li>
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm text-on-surface-variant">
        <li>
          <Link href="/" className="hover:text-on-surface transition-colors">
            Dashboard
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
          const isLast = index === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span className="font-medium text-on-surface" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={href} className="hover:text-on-surface transition-colors">
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
