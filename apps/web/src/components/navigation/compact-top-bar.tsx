"use client";

import { IconButton, SearchAppBar } from "@vkieu/mui";
import type { RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import { DisplaySettings } from "./display-settings";

/**
 * The compact (below md) top app bar: a navigation icon that opens the modal drawer, the
 * display-settings sheet in the actions slot, and Strata's command-palette trigger in the
 * search slot (pressing it dispatches the ⌘K `KeyboardEvent` that opens `CommandPalette`,
 * not a docs-style full-screen search field). Its pinned surface-fill responds to the
 * `<main>` scroll container, not the window.
 */
export function CompactTopBar({
  onOpenNav,
  scrollRef,
}: {
  onOpenNav: () => void;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  return (
    <SearchAppBar
      scrollBehavior="pinned"
      scrollRef={scrollRef}
      className="sticky top-0 z-20 md:hidden"
      navigationIcon={
        <IconButton
          icon={<Icon name="menu" />}
          aria-label="Open navigation"
          onPress={onOpenNav}
        />
      }
      actions={<DisplaySettings />}
    >
      <IconButton
        variant="standard"
        aria-label="Search (⌘K)"
        onPress={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
        }}
        icon={<Icon name="search" size={24} />}
      />
    </SearchAppBar>
  );
}
