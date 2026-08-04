export type PersonStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'SUSPENDED';

export interface Person {
  id: string;
  fullName: string;
  title: string;
  squads: string[];
  salary: number;
  parentId: string | null;
  avatarUrl?: string;
  departmentId?: string;
  uin?: string;
  status: PersonStatus;
  capacityAllocation: number;
  departmentName?: string;
  positionTitle?: string;
  temporary?: boolean;
  canEdit?: boolean;
  startDate?: string;
}

export interface VacancyNode {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  level: number;
}

export type OrgChartViewMode = 'reporting' | 'department';

export interface TreeNode {
  person: Person;
  children: TreeNode[];
  depth: number;
}

export interface PersonRepository {
  fetchAll(): Promise<Person[]>;
  create(data: {
    fullName: string;
    title: string;
    squads?: string[];
    salary?: number;
    parentId?: string | null;
  }): Promise<Person>;
  update(
    id: string,
    data: Partial<Pick<Person, "fullName" | "title" | "squads" | "salary" | "parentId">>
  ): Promise<Person>;
  delete(id: string): Promise<void>;
}
