"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { TopAppBar, Card } from "@windmorph/react";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";

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
  const reduced = useReducedMotionContext();

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <TopAppBar
        title={<h1 className="text-headline-medium">Finance</h1>}
        subtitle="Budgets, capacity planning, and rate cards."
      />

      {/* ─── Hub Navigation Cards ────────────────────────────────────────── */}
      <section aria-label="Finance sections">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FINANCE_LINKS.map((link, index) => (
            <motion.div
              key={link.href}
              variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
              initial="initial"
              whileInView="enter"
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                ...defaultTransition,
                delay: reduced ? 0 : index * 0.05,
              }}
            >
              <Link href={link.href} className="group block h-full">
                <Card
                  variant="elevated"
                  className="h-full transition-shadow group-hover:shadow-md"
                >
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${link.tint}`}
                    >
                      <Icon name={link.icon} size={24} className={link.iconColor} />
                    </div>
                    <div>
                      <h3 className="text-title-large">{link.title}</h3>
                      <p className="mt-1 text-body-medium text-on-surface-variant">
                        {link.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
