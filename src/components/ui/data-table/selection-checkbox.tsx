"use client";

import { Checkbox } from "react-aria-components";
import { Icon } from "@/components/ui/icon";

/** A Material 3 checkbox for React Aria's table selection slot (Windmorph tokens). */
export function SelectionCheckbox({ "aria-label": ariaLabel }: { "aria-label"?: string }) {
  return (
    <Checkbox
      slot="selection"
      aria-label={ariaLabel}
      className="group flex size-10 items-center justify-center rounded-full outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-secondary"
    >
      {({ isSelected, isIndeterminate }) => (
        <span
          className={`flex size-[18px] items-center justify-center rounded-[2px] border-2 ${
            isSelected || isIndeterminate
              ? "border-primary bg-primary text-on-primary"
              : "border-on-surface-variant"
          }`}
        >
          {(isSelected || isIndeterminate) && (
            <Icon name={isIndeterminate ? "remove" : "check"} size={16} weight={700} />
          )}
        </span>
      )}
    </Checkbox>
  );
}
