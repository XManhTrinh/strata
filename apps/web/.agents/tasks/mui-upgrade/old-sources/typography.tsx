"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "./lib/utils";

/**
 * Material Design 3 Typography
 *
 * M3 Specs (m3.material.io/styles/typography/type-scale-tokens):
 * - 15 roles across 5 categories (display, headline, title, body, label) × 3 sizes (large, medium, small)
 * - Each role defines: font-family, font-weight, font-size, line-height, letter-spacing
 * - Display: 57/45/36px, weight 400, tracking -0.25/0/0
 * - Headline: 32/28/24px, weight 400, tracking 0
 * - Title: 22/16/14px, weight 500 (medium only for 16/14), 22px uses 400
 * - Body: 16/14/12px, weight 400, tracking 0.5/0.25/0.4
 * - Label: 14/12/11px, weight 500, tracking 0.1/0.5/0.5
 */

const typographyVariants = cva("", {
  variants: {
    variant: {
      "display-large":
        "text-[57px] leading-[64px] font-normal tracking-[-0.25px]",
      "display-medium":
        "text-[45px] leading-[52px] font-normal tracking-normal",
      "display-small":
        "text-[36px] leading-[44px] font-normal tracking-normal",
      "headline-large":
        "text-[32px] leading-[40px] font-normal tracking-normal",
      "headline-medium":
        "text-[28px] leading-9 font-normal tracking-normal",
      "headline-small":
        "text-[24px] leading-[32px] font-normal tracking-normal",
      "title-large":
        "text-[22px] leading-7 font-normal tracking-normal",
      "title-medium":
        "text-[16px] leading-6 font-medium tracking-[0.15px]",
      "title-small":
        "text-[14px] leading-5 font-medium tracking-[0.1px]",
      "body-large":
        "text-[16px] leading-6 font-normal tracking-[0.5px]",
      "body-medium":
        "text-[14px] leading-5 font-normal tracking-[0.25px]",
      "body-small":
        "text-[12px] leading-4 font-normal tracking-[0.4px]",
      "label-large":
        "text-[14px] leading-5 font-medium tracking-[0.1px]",
      "label-medium":
        "text-[12px] leading-4 font-medium tracking-[0.5px]",
      "label-small":
        "text-[11px] leading-4 font-medium tracking-[0.5px]",
    },
    color: {
      "surface-foreground": "text-surface-foreground",
      "surface-variant-foreground": "text-surface-variant-foreground",
      primary: "text-primary",
      secondary: "text-secondary",
      tertiary: "text-tertiary",
      error: "text-error",
      "primary-container-foreground": "text-primary-container-foreground",
      "secondary-container-foreground": "text-secondary-container-foreground",
      "tertiary-container-foreground": "text-tertiary-container-foreground",
    },
  },
  defaultVariants: {
    variant: "body-medium",
    color: "surface-foreground",
  },
});

/**
 * Default HTML element mapping per variant category.
 * Display/Headline/Title → heading tags, Body → p, Label → span.
 */
const ELEMENT_MAP: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
  "display-large": "h1",
  "display-medium": "h2",
  "display-small": "h3",
  "headline-large": "h2",
  "headline-medium": "h3",
  "headline-small": "h4",
  "title-large": "h5",
  "title-medium": "h6",
  "title-small": "h6",
  "body-large": "p",
  "body-medium": "p",
  "body-small": "p",
  "label-large": "span",
  "label-medium": "span",
  "label-small": "span",
};

type TypographyVariant = NonNullable<
  VariantProps<typeof typographyVariants>["variant"]
>;

type TypographyColor = NonNullable<
  VariantProps<typeof typographyVariants>["color"]
>;

type TypographyProps = React.HTMLAttributes<HTMLElement> & {
  /** M3 type scale role. Default: "body-medium" */
  variant?: TypographyVariant;
  /** Override the rendered HTML element */
  as?: React.ElementType;
  /** Text color from M3 color tokens. Default: "surface-foreground" */
  color?: TypographyColor;
  /** Render as child element (Radix Slot pattern) */
  asChild?: boolean;
  /** Additional class names (merged via cn/tailwind-merge) */
  className?: string;
  children?: React.ReactNode;
}

/**
 * Typography component implementing the full M3 type scale.
 *
 * Renders semantically appropriate HTML elements by default (h1–h6, p, span)
 * based on the variant, or any element via the `as` prop.
 *
 * @example
 * ```tsx
 * <Typography variant="headline-large">Page Title</Typography>
 * <Typography variant="body-medium" color="surface-variant-foreground">
 *   Description text
 * </Typography>
 * <Typography variant="label-large" as="button">Click me</Typography>
 * ```
 */
const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = "body-medium",
      color = "surface-foreground",
      as,
      asChild = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : as || ELEMENT_MAP[variant] || "p";

    return (
      <Comp
        ref={ref as React.Ref<never>}
        className={cn(typographyVariants({ variant, color }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Typography.displayName = "Typography";

export { Typography, typographyVariants, ELEMENT_MAP };
export type { TypographyProps, TypographyVariant, TypographyColor };
