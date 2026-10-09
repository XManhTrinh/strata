"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { TopAppBar, Card } from "@vkieu/mui";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Finance hub sections ─────────────────────────────────────────────────────

interface FinanceLink {
  href: string;
  title: string;
  description: string;
  icon: string;
  tint: string;
  iconColor: string;
}

const FINANCE_LINKS: FinanceLink[] = [
  {
    href: "/finance/budgets",
    title: "Budgets",
    description: "Headcount and cost breakdown by division and squad.",
    icon: "payments",
    tint: "bg-primary-container",
    iconColor: "text-on-primary-container",
  },
  {
    href: "/finance/capacity",
    title: "Capacity Planning",
    description: "FTE allocation and monthly phasing across squads.",
    icon: "stacked_bar_chart",
    tint: "bg-secondary-container",
    iconColor: "text-on-secondary-container",
  },
  {
    href: "/finance/rate-cards",
    title: "Rate Cards",
    description: "Define rate card sets and the rules that match members to rates.",
    icon: "request_quote",
    tint: "bg-tertiary-container",
    iconColor: "text-on-tertiary-container",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <TopAppBar title={<h1 className="text-headline-medium">Finance</h1>} subtitle="Budgets, capacity planning, and rate cards." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FINANCE_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block group">
            <Card
              variant="elevated"
              className="h-full transition-shadow group-hover:shadow-md"
            >
              <CardContent className="p-6">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full ${link.tint} mb-4`}
                >
                  <Icon name={link.icon} size={26} className={link.iconColor} />
                </div>
                <h5 className="text-title-large mb-1">
                  {link.title}
                </h5>
                <p className="text-body-medium text-on-surface-variant">
                  {link.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
