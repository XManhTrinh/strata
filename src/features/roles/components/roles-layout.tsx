"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { RoleSummary } from "../queries";
import { RolesList } from "./roles-list";

/**
 * Material 3 list-detail for roles: from 1200px the roles and the open role side by side; below,
 * one at a time (the role's page has a way back). Each role keeps its own address.
 */
export function RolesLayout({ roles, children }: { roles: RoleSummary[]; children: ReactNode }) {
  const pathname = usePathname();
  const openId = pathname.split("/settings/roles/")[1]?.split("/")[0] ?? null;
  return (
    <div className="large:grid large:grid-cols-[22rem_minmax(0,1fr)] large:items-start large:gap-8">
      {/* Side by side, the list stays in view below the top app bar while the role scrolls. */}
      <div
        className={`large:sticky large:top-16 large:max-h-[calc(100dvh-4rem)] large:overflow-y-auto ${
          openId ? "large:block hidden" : ""
        }`}
      >
        <RolesList roles={roles} openId={openId} />
      </div>
      <div className={openId ? "" : "large:block hidden"}>{children}</div>
    </div>
  );
}
