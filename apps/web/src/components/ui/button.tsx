"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useRipple } from "@/components/ui/ripple";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 text-[14px] leading-[20px] tracking-[0.1px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md rounded-full hover:shadow-lg hover:bg-primary/92 active:scale-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md rounded-full hover:shadow-lg hover:bg-destructive/92 active:scale-[0.97]",
        outline:
          "border border-outline bg-transparent text-primary rounded-full hover:bg-primary/8 active:scale-[0.97]",
        secondary:
          "bg-secondary-container text-secondary-container-foreground rounded-full shadow-sm hover:shadow-md hover:bg-secondary-container/90 active:scale-[0.97]",
        ghost: "rounded-full text-foreground hover:bg-accent active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline cursor-pointer rounded-none",
      },
      size: {
        default: "h-10 px-6 min-w-[48px]",
        sm: "h-[34px] px-4 min-w-[48px] text-[13px]",
        lg: "h-12 px-8 min-w-[48px] text-[15px]",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Disable ripple effect */
  disableRipple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disableRipple = false, onMouseDown, onTouchStart, ...props }, ref) => {
    const { ripples, trigger, containerRef } = useRipple();
    const Comp = asChild ? Slot : "button";

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disableRipple && variant !== "link") trigger(e);
      onMouseDown?.(e);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
      if (!disableRipple && variant !== "link") trigger(e);
      onTouchStart?.(e);
    };

    return (
      <Comp
        ref={(node: HTMLButtonElement | null) => {
          (containerRef as React.MutableRefObject<HTMLElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(buttonVariants({ variant, size, className }))}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        {...props}
      >
        {props.children}
        {/* Ripple circles */}
        {!disableRipple && variant !== "link" && ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-current/20 animate-[ripple_500ms_ease-out_forwards] pointer-events-none"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
