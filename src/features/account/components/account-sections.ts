export const ACCOUNT_SECTIONS = [
  { key: "profile", icon: "person" },
  { key: "notifications", icon: "notifications" },
] as const;

export type AccountSectionKey = (typeof ACCOUNT_SECTIONS)[number]["key"];
