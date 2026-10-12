"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { TopAppBar, Card } from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";

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
    title: "Hierarchy",
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
  {
    title: "Settings",
    description: "Company profile, financial configuration, and workspace preferences",
    href: "/admin/settings",
    icon: "settings",
    feature: "authorization",
    permission: "manage_features",
  },
];

export default function SettingsPage() {
  const reduced = useReducedMotionContext();
  const { hasPermission } = useUserPermissions();

  const visibleCards = settingsCards.filter((card) =>
    hasPermission(card.feature, card.permission)
  );

  return (
    <motion.div
      className="space-y-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <TopAppBar title={<h1 className="text-headline-medium">Settings</h1>} subtitle="Platform configuration and preferences." />

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card, index) => (
          <motion.div
            key={card.href}
            variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
            initial="initial"
            animate="enter"
            transition={{
              ...defaultTransition,
              delay: reduced ? 0 : index * 0.05,
            }}
          >
            <Card variant="outlined" className="h-full transition-shadow hover:shadow-md">
              <Link href={card.href} className="block h-full">
                <CardContent className="flex h-full flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
                      <Icon name={card.icon} size={24} className="text-on-primary-container" />
                    </div>
                    <Icon name="chevron_right" size={24} className="text-on-surface-variant" />
                  </div>
                  <h2 className="text-title-medium">{card.title}</h2>
                  <p className="mt-2 text-body-medium text-on-surface-variant">
                    {card.description}
                  </p>
                </CardContent>
              </Link>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
