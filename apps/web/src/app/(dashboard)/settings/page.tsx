"use client";

import Link from "next/link";
import { AppBar } from "@/components/layout/app-bar";
import { useUserPermissions } from "@/hooks/use-user-permissions";

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: string;
  feature: string;
  permission?: string;
}

const settingsCards: SettingsCard[] = [
  {
    title: "Organization Unit Types",
    description: "Define and manage the types of organizational units (departments, tribes, squads, etc.)",
    href: "/settings/org-unit-types",
    icon: "🏷️",
    feature: "authorization",
    permission: "manage_org_structure",
  },
  {
    title: "Organization Structure",
    description: "Build and manage your organization's hierarchical structure",
    href: "/settings/org-structure",
    icon: "🏢",
    feature: "authorization",
    permission: "manage_org_structure",
  },
  {
    title: "Positions",
    description: "Configure positions with career levels and reporting capabilities",
    href: "/settings/positions",
    icon: "💼",
    feature: "authorization",
    permission: "manage_positions",
  },
  {
    title: "Roles & Permissions",
    description: "Manage roles and assign feature-level permissions with scope control",
    href: "/settings/roles",
    icon: "🔐",
    feature: "authorization",
    permission: "manage_roles",
  },
  {
    title: "Features",
    description: "View registered features and control which are enabled for your organization",
    href: "/settings/features",
    icon: "⚙️",
    feature: "authorization",
    permission: "manage_features",
  },
];

export default function SettingsPage() {
  const { hasPermission } = useUserPermissions();

  const visibleCards = settingsCards.filter((card) =>
    hasPermission(card.feature, card.permission)
  );

  return (
    <div className="space-y-4">
      <AppBar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">
            Platform configuration and preferences.
          </p>
        </div>
      </AppBar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-lg border border-border bg-background p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="mb-3 text-2xl">{card.icon}</div>
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
