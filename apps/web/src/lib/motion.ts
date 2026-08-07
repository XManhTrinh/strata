import type { Variants, Transition } from "motion/react";

export const dialogOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const dialogContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const skeletonShimmerVariants: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: { backgroundPosition: "200% 0" },
};

export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
};

export const sheetVariants: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0 },
  exit: { x: "-100%" },
};

export const defaultTransition: Transition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
};

export const springTransition: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/**
 * Resolves animation variants respecting reduced motion preference.
 * When reducedMotion is true, all transition durations are set to 0.
 */
export function resolveAnimationVariants(
  variants: Variants,
  reducedMotion: boolean
): Variants {
  if (!reducedMotion) return variants;

  return Object.fromEntries(
    Object.entries(variants).map(([key, value]) => [
      key,
      typeof value === "object" && value !== null
        ? { ...value, transition: { duration: 0 } }
        : value,
    ])
  );
}
