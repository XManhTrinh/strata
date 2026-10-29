"use client";

import { type ReactNode, createContext, useContext } from "react";
import type { Database } from "@/lib/supabase/database.types";

type Reach = Database["public"]["Enums"]["reach"];

type WorkspaceSummary = { id: string; slug: string; name: string };

export type WorkspaceContextValue = {
  workspace: WorkspaceSummary;
  /** Permission key → reaches held, from `my_permissions`. For showing UI only: the database enforces. */
  permissions: Record<string, Reach[]>;
  workspaces: WorkspaceSummary[];
  user: { id: string; fullName: string; email: string; avatarUrl: string | null };
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside a workspace page.");
  return value;
}

/** Whether the user holds any of the permissions (at any reach). For showing UI only. */
export function useCan(...permissionKeys: string[]): boolean {
  const { permissions } = useWorkspace();
  return permissionKeys.some((key) => (permissions[key]?.length ?? 0) > 0);
}
