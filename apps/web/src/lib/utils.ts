import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Placeholder emails generated during CSV import (for people without an email)
 * use the `@placeholder.local` domain. They satisfy the required/unique email
 * constraint but shouldn't be shown to users.
 */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@placeholder.local");
}

/** Human-friendly email for display: hides import placeholders as "No email". */
export function displayEmail(email: string | null | undefined): string {
  if (!email || isPlaceholderEmail(email)) return "No email";
  return email;
}
