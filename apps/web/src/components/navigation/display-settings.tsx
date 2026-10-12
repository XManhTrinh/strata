"use client";

import {
  FilterChip,
  IconButton,
  SheetTrigger,
  SideSheet,
  useTheme,
  type ColorMode,
  Select,
  SelectItem,
} from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";

const MODES: { value: ColorMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Theme + mode controls built from `useTheme()`. Mode is a row of filter chips over
 * light / dark / system; theme is Strata's local `Select` over the built-in theme names.
 * A deliberate Strata-consistency deviation from the reference's ButtonGroup/Menu
 * (contrast / motion / direction are out of scope — mode + theme only).
 */
export function ThemeControls() {
  const { mode, setMode, theme, setTheme, themes } = useTheme();

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-2">
        <span className="text-label-large text-on-surface-variant">Mode</span>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <FilterChip
              key={m.value}
              selected={mode === m.value}
              onSelectedChange={() => setMode(m.value)}
            >
              {m.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {themes.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-label-large text-on-surface-variant">Theme</span>
          <Select
            aria-label="Theme"
            selectedKey={theme}
            onSelectionChange={(key) => setTheme(key == null ? "" : String(key))}
          >
            {themes.map((t) => (
              <SelectItem key={t}>{t}</SelectItem>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}

/**
 * The display settings (mode + theme) in a modal side sheet, opened from a settings
 * `IconButton`. Placed in the rail's bottom slot and the compact bar's actions.
 */
export function DisplaySettings() {
  return (
    <SheetTrigger>
      <IconButton icon={<Icon name="settings" />} aria-label="Display settings" />
      <SideSheet
        title="Display"
        className="w-80"
        actions={({ close }) => (
          <IconButton icon={<Icon name="close" />} aria-label="Close display settings" onPress={close} />
        )}
      >
        <ThemeControls />
      </SideSheet>
    </SheetTrigger>
  );
}
