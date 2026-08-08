"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-container-high group-[.toaster]:text-surface-foreground group-[.toaster]:border-outline-variant group-[.toaster]:shadow-[0_4px_8px_var(--elevation-3)]",
          description: "group-[.toast]:text-surface-variant-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full group-[.toast]:text-[14px] group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-surface-variant-foreground group-[.toast]:text-[14px] group-[.toast]:font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
