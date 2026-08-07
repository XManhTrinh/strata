import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

const COMPANY_ID = "cm_acme_corp_001";

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
export function useOrgChart(companyId: string = COMPANY_ID) {
  return useQuery<OrgTreeNode[]>({
    queryKey: ["org-chart", companyId],
    queryFn: () =>
      apiClient<OrgTreeNode[]>(`/api/v2/companies/${companyId}/org-chart`),
    enabled: !!companyId,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch employees grouped by a specific org unit, with ancestor breadcrumb.
 */
export function useOrgChartByUnit(
  companyId: string = COMPANY_ID,
  unitId: string | undefined
) {
  return useQuery<UnitViewResponse>({
    queryKey: ["org-chart", "unit", companyId, unitId],
    queryFn: () =>
      apiClient<UnitViewResponse>(
        `/api/v2/companies/${companyId}/org-chart/unit/${unitId}`
      ),
    enabled: !!companyId && !!unitId,
    staleTime: 30_000,
  });
}
