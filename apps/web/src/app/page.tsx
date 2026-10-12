"use client";

import { motion } from "motion/react";
import { Button, Card } from "@vkieu/windmorph";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";
// This route sits OUTSIDE the dashboard shell, so it is not wrapped by
// ReducedMotionProvider — read the preference from the underlying hook directly.
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Marketing homepage (standalone route, outside the dashboard shell).
 *
 * Routing tradeoff: the nav/CTA `Button href=` render plain `<a>` anchors, so
 * `/login` and `/register` trigger a full-page navigation (no next/link
 * soft-nav or prefetch). This is the accepted batch-1 intent for low-frequency
 * marketing → app links.
 */
export default function LandingPage() {
  const reduced = useReducedMotion();
  const heroVariants = resolveAnimationVariants(pageTransitionVariants, reduced);

  return (
    <div className="min-h-dvh bg-surface">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"
              aria-hidden="true"
            >
              <span className="text-label-large font-bold text-on-primary">S</span>
            </div>
            <span className="text-title-medium">Strata</span>
          </div>
          <nav aria-label="Primary" className="flex items-center gap-3">
            <Button variant="text" href="/login">
              Sign in
            </Button>
            <Button variant="filled" href="/register">
              Get started
            </Button>
          </nav>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────────── */}
      <main>
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <motion.section
          className="mx-auto max-w-6xl px-6 py-24 lg:py-32"
          variants={heroVariants}
          initial="initial"
          animate="enter"
          transition={defaultTransition}
          aria-label="Introduction"
        >
          <div className="max-w-3xl">
            <h1 className="font-brand text-display-small tracking-tight sm:text-display-medium lg:text-display-large">
              Enterprise workforce management,{" "}
              <span className="text-primary">simplified</span>
            </h1>
            <p className="mt-6 max-w-2xl text-body-large text-on-surface-variant">
              Strata helps organizations manage their people, teams, capacity,
              and budgets in one unified platform. Built for enterprises with
              complex organizational structures.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button variant="filled" href="/register">
                Start free trial
              </Button>
              <Button variant="outlined" href="#features">
                See features
              </Button>
            </div>
          </div>
        </motion.section>

        {/* ─── Features ─────────────────────────────────────────────────── */}
        <section
          id="features"
          className="scroll-mt-16 border-t border-outline-variant bg-surface-container-low py-24"
          aria-label="Features"
        >
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center font-brand text-headline-large">
              Everything you need to manage your workforce
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-body-large text-on-surface-variant">
              From org charts to capacity planning, Strata covers the full
              spectrum of workforce operations.
            </p>

            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={heroVariants}
                  initial="initial"
                  whileInView="enter"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    ...defaultTransition,
                    delay: reduced ? 0 : index * 0.05,
                  }}
                >
                  <Card variant="outlined" className="h-full">
                    <CardContent>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
                        <Icon
                          name={feature.icon}
                          size={24}
                          className="text-on-primary-container"
                        />
                      </div>
                      <h3 className="text-title-medium">{feature.title}</h3>
                      <p className="mt-2 text-body-medium text-on-surface-variant">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24" aria-label="Get started">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-brand text-headline-large">
              Ready to streamline your workforce management?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-body-large text-on-surface-variant">
              Join organizations that trust Strata to manage their teams,
              budgets, and organizational structures.
            </p>
            <div className="mt-8">
              <Button variant="filled" href="/register">
                Get started today
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-outline-variant py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded bg-primary"
              aria-hidden="true"
            >
              <span className="text-label-small font-bold text-on-primary">S</span>
            </div>
            <span className="text-title-small">Strata</span>
          </div>
          <p className="text-body-small text-on-surface-variant">
            © {new Date().getFullYear()} Strata. Enterprise Workforce
            Management.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "apartment",
    title: "Organization Charts",
    description:
      "Interactive, drag-and-drop org charts with real-time hierarchy management and role visualization.",
  },
  {
    icon: "group",
    title: "People Management",
    description:
      "Centralized employee records with UIN tracking, department assignments, and employment lifecycle management.",
  },
  {
    icon: "bar_chart",
    title: "Capacity Planning",
    description:
      "Allocate team members across squads with percentage-based capacity tracking and utilization heatmaps.",
  },
  {
    icon: "payments",
    title: "Budget Tracking",
    description:
      "Department-level budget planning with actual spend calculations, variance tracking, and over-budget alerts.",
  },
  {
    icon: "calendar_month",
    title: "Leave Management",
    description:
      "Request and approve leave with overlap detection, team calendar views, and configurable policies.",
  },
  {
    icon: "admin_panel_settings",
    title: "Roles & Permissions",
    description:
      "Scoped access control with SELF, TEAM, and ORGANIZATION permission levels. SSO integration included.",
  },
];
