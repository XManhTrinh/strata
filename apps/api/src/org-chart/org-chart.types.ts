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

export interface FlatEmployee {
  userId: string;
  fullName: string;
  email: string;
  positionTitle: string | null;
  departmentName: string | null;
}

export interface FlatRelationship {
  userId: string;
  managerId: string;
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

export interface OrgChartPerson {
  id: string;
  fullName: string;
  title: string; // positionTitle or "No title"
  squads: string[];
  salary: number | null; // null if viewer doesn't have permission
  parentId: string | null; // managerId from reporting relationship
  avatarUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  uin: string | null;
  status: string; // ACTIVE, ON_LEAVE, etc.
  capacityAllocation: number; // 0 if not visible
  positionTitle: string | null;
}
