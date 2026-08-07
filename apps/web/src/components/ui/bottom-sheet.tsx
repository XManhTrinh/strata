"use client";

import * as React from "react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Bottom Sheet
 *
 * M3 Specs (m3.material.io/components/bottom-sheets/specs):
 * - Corner radius: 28px (top corners only)
 * - Background: surface-container-low (mapped to surface)
 * - Drag handle: 32px width, 4px height, centered, 22px from top
 * - Max height: 90vh
 * - Modal variant: has scrim overlay
 * - Uses framer-motion for drag-to-dismiss and snap points
 */

export interface BottomSheetProps {
  /** Whether the bottom sheet is open */
  open: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Whether to show the modal scrim overlay */
  modal?: boolean;
  /** Content of the bottom sheet */
  children: React.ReactNode;
  /** Additional class for the sheet container */
  className?: string;
  /** Snap points as percentages of viewport height (e.g., [0.5, 0.9]) */
  snapPoints?: number[];
}

const BottomSheet = React.forwardRef<HTMLDivElement, BottomSheetProps>(
  ({ open, onClose, modal = true, children, className, snapPoints }, ref) => {
    const dragControls = useDragControls();

    const handleDragEnd = (_: unknown, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    };

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Scrim overlay */}
            {modal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/40"
                onClick={onClose}
                aria-hidden="true"
              />
            )}

            {/* Sheet */}
            <motion.div
              ref={ref}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragControls={dragControls}
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] rounded-t-[28px] bg-surface shadow-2xl",
                className
              )}
            >
              {/* Drag handle */}
              <div
                className="flex items-center justify-center pt-[22px] pb-4 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-8 h-1 rounded-full bg-surface-variant-foreground/40" />
              </div>

              {/* Content */}
              <div className="overflow-y-auto px-4 pb-4 max-h-[calc(90vh-60px)]">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);
BottomSheet.displayName = "BottomSheet";

export { BottomSheet };
