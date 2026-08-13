"use client";

import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { useCapacityAllocations } from "@/services";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip } from "@vkieu/mui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

function AllocationBar({ percentage }: { percentage: number }) {
  const clampedValue = Math.min(100, Math.max(0, percentage));
  const color =
    clampedValue >= 90
      ? "bg-error"
      : clampedValue >= 70
        ? "bg-warning"
        : "bg-primary";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 rounded-full bg-surface-variant/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export default function CapacityPage() {
  const { data: allocations, isLoading, isError, error, refetch } =
    useCapacityAllocations();

  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Team member capacity allocation overview.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load data
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              {error?.message || "Failed to load capacity data"}
            </p>
            <Button variant="tonal" onClick={() => refetch()}>
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
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Team member capacity allocation overview.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-2 w-full rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-12 rounded-lg" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allocationList = allocations ?? [];

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
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Team member capacity allocation overview.
          </p>
        </div>
      </AppBar>

      {/* Desktop Table */}
      <Card variant="elevated" className="hidden md:block">
        <CardContent className="p-0">
          {allocationList.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="bar_chart" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No allocations yet
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground">
                No capacity allocations have been configured.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Squad</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocationList.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell className="text-[14px] leading-5 font-medium text-surface-foreground">
                      {alloc.employee?.person?.fullName ?? alloc.employeeId}
                    </TableCell>
                    <TableCell className="text-[14px] leading-5 text-surface-variant-foreground">
                      {alloc.squad?.name ?? alloc.squadId}
                    </TableCell>
                    <TableCell>
                      <AllocationBar percentage={alloc.percentage} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Chip
                        variant="filter"
                        selected={alloc.percentage >= 70}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4">
        {allocationList.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="bar_chart" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No allocations yet
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground">
                No capacity allocations have been configured.
              </p>
            </CardContent>
          </Card>
        ) : (
          allocationList.map((alloc) => (
            <Card key={alloc.id} variant="elevated">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] leading-5 font-medium text-surface-foreground">
                      {alloc.employee?.person?.fullName ?? alloc.employeeId}
                    </p>
                    <p className="text-[12px] leading-4 text-surface-variant-foreground">
                      {alloc.squad?.name ?? alloc.squadId}
                    </p>
                  </div>
                  <Chip
                    variant="filter"
                    selected={alloc.percentage >= 70}
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
                <AllocationBar percentage={alloc.percentage} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}
