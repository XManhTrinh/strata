import { createWorkspaceSchema } from "@/features/workspaces/schemas";

export const workspaceSettingsSchema = createWorkspaceSchema.omit({ template: true });
