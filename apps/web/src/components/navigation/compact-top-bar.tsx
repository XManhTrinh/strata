"use client";

import { IconButton, TopAppBar } from "@vkieu/mui";
import type { RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import { DisplaySettings } from "./display-settings";

/**
 * The compact (below md) top app bar: a navigation icon that opens the modal drawer and the
 * display-settings sheet in the actions slot, titled with the Strata wordmark. Its pinned
 * surface-fill responds to the `<main>` scroll container, not the window.
 */
export function CompactTopBar({
  onOpenNav,
  scrollRef,
}: {
  onOpenNav: () => void;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  return (
    <TopAppBar
      scrollBehavior="pinned"
      scrollRef={scrollRef}
      className="sticky top-0 z-20 md:hidden"
      title={<span className="text-title-medium font-medium">Strata</span>}
      navigationIcon={
        <IconButton
          icon={<Icon name="menu" />}
          aria-label="Open navigation"
          onPress={onOpenNav}
        />
      }
      actions={<DisplaySettings />}
    />
  );
}
