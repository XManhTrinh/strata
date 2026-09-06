import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgTreeNode {
  id: string;
  fullName: string;
  email: string;
  positionTitle: string | null;
  managerId: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
  directReports: OrgTreeNode[];
}

export interface UnitEmployee {
  id: string;
  fullName: string;
  positionTitle: string | null;
  status: string;
}

export interface UnitAncestor {
  id: string;
  name: string;
  typeName: string;
}

export interface UnitViewResponse {
  unit: {
    id: string;
    name: string;
    typeName: string;
    managerId: string | null;
  };
  parentChain: UnitAncestor[];
  employees: UnitEmployee[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch the full reporting hierarchy tree for a company.
 * Returns an array of root nodes with nested directReports.
 */
export function useOrgChart(companyId: string) {
  return useQuery<OrgTreeNode[]>({
    queryKey: ["org-chart", companyId],
    queryFn: () =>
      apiClient<OrgTreeNode[]>(`/companies/${companyId}/org-chart`),
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

/**
 * Fetch employees grouped by a specific org unit, with ancestor breadcrumb.
 */
export function useOrgChartByUnit(companyId: string, unitId: string | undefined) {
  return useQuery<UnitViewResponse>({
    queryKey: ["org-chart", "unit", companyId, unitId],
    queryFn: () =>
      apiClient<UnitViewResponse>(
        `/companies/${companyId}/org-chart/unit/${unitId}`
      ),
    enabled: !!companyId && !!unitId,
    staleTime: 30_000,
  });
}

// ─── People (flat array for ReactFlow org chart) ─────────────────────────────

export interface OrgChartPerson {
  id: string;
  fullName: string;
  title: string;
  squads: string[];
  salary: number | null;
  parentId: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  uin: string | null;
  status: string;
  capacityAllocation: number;
  positionTitle: string | null;
}

/**
 * Fetch flat array of all people for the org chart.
 * Salary visibility is controlled server-side based on the requesting user's permissions.
 */
export function useOrgChartPeople(companyId: string) {
  return useQuery<OrgChartPerson[]>({
    queryKey: ["org-chart", "people", companyId],
    queryFn: () =>
      apiClient<OrgChartPerson[]>(
        `/companies/${companyId}/org-chart/people`
      ),
    enabled: !!companyId,
    staleTime: 30_000,
  });
}
