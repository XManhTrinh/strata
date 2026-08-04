"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "right" | "left";
}

const slideVariants = {
  right: {
    hidden: { x: "100%" },
    visible: { x: 0, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
    exit: { x: "100%", transition: { duration: 0.2 } },
  },
  left: {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
    exit: { x: "-100%", transition: { duration: 0.2 } },
  },
};

export function Drawer({ open, onClose, title, children, position = "right" }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        drawerRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || "Drawer panel"}
            tabIndex={-1}
            className={`fixed inset-y-0 ${position === "right" ? "right-0" : "left-0"} z-10 flex w-full max-w-md flex-col border-${position === "right" ? "l" : "r"} border-border bg-card shadow-xl focus:outline-none`}
            variants={slideVariants[position]}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Close drawer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
