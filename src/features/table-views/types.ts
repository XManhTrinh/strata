export type TableView = {
  id: string;
  name: string;
  /** Shared with the workspace (no owner). */
  shared: boolean;
  isDefault: boolean;
  state: unknown;
};
