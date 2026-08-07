"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Carousel
 *
 * M3 Specs (m3.material.io/components/carousel/specs):
 * - Horizontal scroll container with snap points
 * - Items peek from edges (next/prev items partially visible)
 * - Navigation: dots indicator + optional arrow buttons
 * - Spacing between items: 8px
 * - Item border-radius: 28px (extra large)
 * - Uses framer-motion for smooth scroll/swipe
 */

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show dot indicators */
  showDots?: boolean;
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ className, children, showArrows = true, showDots = true, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [itemCount, setItemCount] = React.useState(0);

    React.useEffect(() => {
      setItemCount(React.Children.count(children));
    }, [children]);

    const scrollTo = (index: number) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const items = container.children;
      if (items[index]) {
        const item = items[index] as HTMLElement;
        const scrollLeft = item.offsetLeft - container.offsetLeft - 16;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
        setActiveIndex(index);
      }
    };

    const handleScroll = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const scrollLeft = container.scrollLeft;
      const itemWidth = container.scrollWidth / itemCount;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveIndex(Math.max(0, Math.min(newIndex, itemCount - 1)));
    };

    return (
      <div ref={ref} className={cn("relative w-full", className)} {...props}>
        {/* Scroll container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {React.Children.map(children, (child) => (
            <div className="snap-center shrink-0">{child}</div>
          ))}
        </div>

        {/* Navigation arrows */}
        {showArrows && itemCount > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-10",
                "flex items-center justify-center w-12 h-12 rounded-full",
                "bg-surface shadow-md text-surface-foreground",
                "hover:bg-surface-variant transition-colors",
                "disabled:opacity-38 disabled:pointer-events-none"
              )}
              disabled={activeIndex === 0}
              aria-label="Previous item"
            >
              <Icon name="chevron_left" size={24} />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(Math.min(itemCount - 1, activeIndex + 1))}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-10",
                "flex items-center justify-center w-12 h-12 rounded-full",
                "bg-surface shadow-md text-surface-foreground",
                "hover:bg-surface-variant transition-colors",
                "disabled:opacity-38 disabled:pointer-events-none"
              )}
              disabled={activeIndex === itemCount - 1}
              aria-label="Next item"
            >
              <Icon name="chevron_right" size={24} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {showDots && itemCount > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: itemCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  i === activeIndex
                    ? "bg-primary w-4"
                    : "bg-outline-variant hover:bg-outline"
                )}
                aria-label={`Go to item ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
Carousel.displayName = "Carousel";

export interface CarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {}

const CarouselItem = React.forwardRef<HTMLDivElement, CarouselItemProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-[28px] overflow-hidden", className)}
      {...props}
    />
  )
);
CarouselItem.displayName = "CarouselItem";

export { Carousel, CarouselItem };
