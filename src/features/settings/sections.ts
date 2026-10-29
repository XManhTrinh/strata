export type SettingsSectionKey = "general" | "members" | "roles" | "features" | "audit";

type SettingsSection = { key: SettingsSectionKey; icon: string; permissions: string[] };

/** Settings sections in order, each shown to people holding any of its permissions. */
const SETTINGS_SECTIONS: SettingsSection[] = [
  { key: "general", icon: "tune", permissions: ["workspace.manage_settings"] },
  {
    key: "members",
    icon: "group",
    permissions: ["members.view", "members.invite", "members.manage", "roles.assign"],
  },
  { key: "roles", icon: "admin_panel_settings", permissions: ["roles.view", "roles.manage"] },
  { key: "features", icon: "toggle_on", permissions: ["workspace.manage_features"] },
  { key: "audit", icon: "history", permissions: ["workspace.view_audit"] },
];

export function visibleSections(permissions: Record<string, unknown[]>): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) =>
    section.permissions.some((key) => (permissions[key]?.length ?? 0) > 0)
  );
}
