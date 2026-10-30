"use server";

import { z } from "zod";
import { signedAvatarUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import type { ChartSlice, UnitCount } from "./types";

const isoDate = z.iso.date();

/**
 * Part of the reporting tree on a date: from `rootId` (managers above, `depth` levels below), from
 * the top without one, or one unit's people.
 */
export async function loadChart(
  workspaceId: string,
  options: { rootId?: string | null; asOf: string; depth?: number; unitId?: string | null }
): Promise<ChartSlice> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("org_chart", {
    p_workspace_id: z.uuid().parse(workspaceId),
    p_root_member_id: options.rootId ? z.uuid().parse(options.rootId) : undefined,
    p_as_of: isoDate.parse(options.asOf),
    p_depth: options.depth ?? 2,
    p_unit_id: options.unitId ? z.uuid().parse(options.unitId) : undefined,
  });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const avatars = await signedAvatarUrls(
    supabase,
    rows.map((r) => r.avatar_path)
  );
  return {
    truncated: rows.some((r) => r.truncated),
    people: rows.map((r) => ({
      id: r.member_id,
      name: r.full_name,
      avatarUrl: (r.avatar_path && avatars.get(r.avatar_path)) || null,
      position: r.position_name,
      unit: r.unit_name,
      managerId: r.manager_member_id,
      depth: r.depth,
      directReports: r.direct_reports,
      managerHidden: r.manager_hidden,
    })),
  };
}

export async function loadUnitCounts(workspaceId: string, asOf: string): Promise<UnitCount[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unit_headcount", {
    p_workspace_id: z.uuid().parse(workspaceId),
    p_as_of: isoDate.parse(asOf),
  });
  return (data ?? []).map((u) => ({ id: u.unit_id, direct: u.direct, total: u.total }));
}
