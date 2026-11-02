/** Help topics, in the order the help page lists them. */
export const HELP_TOPICS = [
  "getting-started",
  "people",
  "time-off",
  "org-chart",
  "planning",
  "settings",
  "your-data",
] as const;
export type HelpTopic = (typeof HELP_TOPICS)[number];

export const LEGAL_PAGES = ["privacy", "terms", "dpa", "sub-processors"] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

/** When the legal pages last changed (shown on each). */
export const LEGAL_UPDATED = "2026-11-02";

/**
 * Who operates Strata, as the legal pages name them. Set the registered company before launch.
 */
export const OPERATOR = {
  company: "[registered company name]",
  companyCountry: "Romania",
  email: "privacy@strata.example",
};

export type DocSection = { heading: string; body: string[] };
