"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Card, CardContent } from "@strata/mui";
import { List, ListItem } from "@strata/mui";
import { Icon } from "@strata/mui";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

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
    href: "/admin/org-unit-types",
    icon: "label",
    feature: "authorization",
    permission: "manage_org_structure",
  },
  {
    title: "Organization Structure",
    description: "Build and manage your organization's hierarchical structure",
    href: "/admin/org-structure",
    icon: "corporate_fare",
    feature: "authorization",
    permission: "manage_org_structure",
  },
  {
    title: "Positions",
    description: "Configure positions with career levels and reporting capabilities",
    href: "/admin/positions",
    icon: "work",
    feature: "authorization",
    permission: "manage_positions",
  },
  {
    title: "Roles & Permissions",
    description: "Manage roles and assign feature-level permissions with scope control",
    href: "/admin/roles",
    icon: "admin_panel_settings",
    feature: "authorization",
    permission: "manage_roles",
  },
  {
    title: "Features",
    description: "View registered features and control which are enabled for your organization",
    href: "/admin/features",
    icon: "toggle_on",
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
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar>
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Platform configuration and preferences.
          </p>
        </div>
      </AppBar>

      {/* Settings List */}
      <Card variant="elevated">
        <CardContent className="p-0">
          <List>
            {visibleCards.map((card) => (
              <Link key={card.href} href={card.href}>
                <ListItem
                  lines={2}
                  interactive
                  leading={
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/12">
                      <Icon name={card.icon} size={24} className="text-primary" />
                    </div>
                  }
                  supporting={card.description}
                  trailing={<Icon name="chevron_right" size={24} className="text-surface-variant-foreground" />}
                >
                  {card.title}
                </ListItem>
              </Link>
            ))}
          </List>
        </CardContent>
      </Card>
    </motion.div>
  );
}
