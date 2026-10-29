/**
 * Returns `next` when it is a path inside this app, so sign-in links can't redirect elsewhere.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
