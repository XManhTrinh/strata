"use client";

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed top-0 left-0 z-9999 -translate-y-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      style={{ color: "hsl(var(--primary-foreground))", backgroundColor: "hsl(var(--primary))" }}
    >
      Skip to content
    </a>
  );
}
