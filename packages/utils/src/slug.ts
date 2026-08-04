/**
 * Generate a URL-friendly slug from text.
 * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
 * removes leading/trailing hyphens, and collapses multiple hyphens.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
