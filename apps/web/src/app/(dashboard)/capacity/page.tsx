"use client";

import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function CapacityPage() {
  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <AppBar>
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Plan and track team capacity, allocation, and resource utilization.
          </p>
        </div>
      </AppBar>

      <Card variant="elevated" className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center py-16 px-8 text-center">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-cyan-100 dark:bg-cyan-900/30 mb-6">
            <Icon name="stacked_bar_chart" size={40} className="text-cyan-600" />
          </div>
          <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
            Coming Soon
          </h2>
          <p className="text-[14px] leading-5 text-surface-variant-foreground max-w-sm">
            Capacity planning will include monthly phasing (P1–P12 allocation per squad),
            resource utilization tracking, and team availability insights.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
