import { visibleSections } from "@/features/settings/sections";
import type { WorkspaceContextValue } from "@/features/workspaces/workspace-context";

export type Destination = {
  key: "home" | "people" | "orgChart" | "settings";
  href: string;
  icon: string;
};

/** The navigation destinations the user can use, in order. Features add theirs as they ship. */
export function destinationsFor({ workspace, permissions }: WorkspaceContextValue): Destination[] {
  const base = `/w/${workspace.slug}`;
  const destinations: Destination[] = [{ key: "home", href: base, icon: "home" }];
  if ((permissions["people.view"]?.length ?? 0) > 0) {
    destinations.push({ key: "people", href: `${base}/people`, icon: "group" });
  }
  if ((permissions["org_chart.view"]?.length ?? 0) > 0) {
    destinations.push({ key: "orgChart", href: `${base}/org-chart`, icon: "account_tree" });
  }
  if (visibleSections(permissions).length > 0) {
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
