"use client";

import { useState } from "react";
import { type CalendarDate, parseDate } from "@internationalized/date";
import { DateField } from "@windmorph/react";

/**
 * A Material 3 date field that submits its date as an ISO string (YYYY-MM-DD) under `name`, so
 * forms and Server Actions deal in plain strings.
 */
export function IsoDateField({
  name,
  label,
  defaultValue,
  min,
  supportingText,
  errorMessage,
  required,
  onChange,
}: {
  name: string;
  label: string;
  /** ISO date, or null for none. */
  defaultValue: string | null;
  /** ISO date: earlier days can't be chosen. */
  min?: string;
  supportingText?: string;
  errorMessage?: string;
  required?: boolean;
  /** Called with the ISO date (or null) when a date is committed. */
  onChange?: (value: string | null) => void;
}) {
  const [value, setValue] = useState<CalendarDate | null>(
    defaultValue ? parseDate(defaultValue) : null
  );
  return (
    <>
      <DateField
        className="w-full"
        label={label}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next?.toString() ?? null);
        }}
        min={min ? parseDate(min) : undefined}
        supportingText={supportingText}
        invalid={Boolean(errorMessage)}
        errorMessage={errorMessage}
        required={required}
      />
      <input type="hidden" name={name} value={value?.toString() ?? ""} />
    </>
  );
}
