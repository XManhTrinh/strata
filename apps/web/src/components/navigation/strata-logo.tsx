/**
 * The Strata brand mark — a self-contained 32×32 glyph that already carries its
 * own rounded-rect + 12% opacity-fill treatment, so it is rendered bare (no
 * reference `bg-primary` squircle wrapper).
 */
export function StrataLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
      aria-label="Strata"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.12" />
      <path d="M8 22h16M8 16h12M8 10h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
