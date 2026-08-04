"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavItem {
  label: string;
  href: string;
  icon: string;
}

const mobileNavItems: MobileNavItem[] = [
  { label: "Home", href: "/", icon: "📊" },
  { label: "People", href: "/people", icon: "👤" },
  { label: "Teams", href: "/engineering", icon: "⚙️" },
  { label: "Leave", href: "/leave", icon: "🏖️" },
  { label: "More", href: "/settings", icon: "☰" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-14">
        {mobileNavItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
