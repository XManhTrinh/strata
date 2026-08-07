"use client";

import { motion } from "motion/react";
import { ProgressBar } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useCapacityAllocations } from "@/services";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip } from "@/components/ui/chips";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function CapacityPage() {
  const { data: allocations, isLoading, isError, error, refetch } =
    useCapacityAllocations();

  if (isError) {
    return (
      <div className="space-y-8">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Capacity</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Team member capacity allocation overview.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              {error?.message || "Failed to load capacity data"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Capacity</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Team member capacity allocation overview.
            </p>
          </div>
        </AppBar>
        <Card variant="outlined">
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-4 border-b border-outline-variant px-4 py-3">
              <span className="text-[12px] leading-4 font-medium text-muted-foreground">Name</span>
              <span className="text-[12px] leading-4 font-medium text-muted-foreground">Squad</span>
              <span className="text-[12px] leading-4 font-medium text-muted-foreground">Allocation</span>
              <span className="text-[12px] leading-4 font-medium text-muted-foreground">%</span>
            </div>
            <div className="divide-y divide-outline-variant">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_2fr_auto] items-center gap-4 px-4 py-3"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar>
        <div>
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Capacity</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Team member capacity allocation overview.
          </p>
        </div>
      </AppBar>

      {/* Capacity Table */}
      <Card variant="outlined">
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-4 border-b border-outline-variant px-4 py-3">
            <span className="text-[12px] leading-4 font-medium text-muted-foreground">Name</span>
            <span className="text-[12px] leading-4 font-medium text-muted-foreground">Squad</span>
            <span className="text-[12px] leading-4 font-medium text-muted-foreground">Allocation</span>
            <span className="text-[12px] leading-4 font-medium text-muted-foreground">%</span>
          </div>
          <div className="divide-y divide-outline-variant">
            {(allocations ?? []).map((alloc) => (
              <div
                key={alloc.id}
                className="grid grid-cols-[1fr_1fr_2fr_auto] items-center gap-4 px-4 py-3"
              >
                <span className="text-[14px] leading-5 font-medium text-foreground">
                  {alloc.employee?.person?.fullName ?? alloc.employeeId}
                </span>
                <span className="text-[14px] leading-5 text-muted-foreground">
                  {alloc.squad?.name ?? alloc.squadId}
                </span>
                <ProgressBar value={alloc.percentage} />
                <Chip
                  variant="assist"
                  leadingIcon={
                    alloc.percentage >= 90
                      ? "warning"
                      : alloc.percentage >= 70
                        ? "trending_up"
                        : "check_circle"
                  }
                >
                  {alloc.percentage}%
                </Chip>
              </div>
            ))}
            {(allocations ?? []).length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <Icon name="bar_chart" size={40} className="text-muted-foreground/40 mb-2" />
                <p className="text-[14px] leading-5 text-muted-foreground">
                  No capacity allocations found
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
