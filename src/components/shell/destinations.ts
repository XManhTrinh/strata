import type { WorkspaceContextValue } from "@/features/workspaces/workspace-context";

export type Destination = {
  key: "home" | "settings";
  href: string;
  icon: string;
};

/** Permissions that make the Settings area useful to someone. */
const SETTINGS_PERMISSIONS = [
  "workspace.manage_settings",
  "workspace.manage_features",
  "workspace.view_audit",
  "members.view",
  "members.invite",
  "members.manage",
  "roles.view",
  "roles.manage",
  "roles.assign",
];

/** The navigation destinations the user can use, in order. Features add theirs as they ship. */
export function destinationsFor({ workspace, permissions }: WorkspaceContextValue): Destination[] {
  const base = `/w/${workspace.slug}`;
  const destinations: Destination[] = [{ key: "home", href: base, icon: "home" }];
  if (SETTINGS_PERMISSIONS.some((key) => permissions[key]?.length)) {
    destinations.push({ key: "settings", href: `${base}/settings`, icon: "settings" });
  }
  return destinations;
}

/** Home matches only itself; other destinations match their sub-pages too. */
export function isCurrent(destination: Destination, pathname: string): boolean {
  return destination.key === "home"
    ? pathname === destination.href
    : pathname === destination.href || pathname.startsWith(`${destination.href}/`);
}
