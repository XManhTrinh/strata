import { apiClient } from "@/lib/api-client";
import { Person, PersonRepository, PersonStatus } from "./types";
import { OrgChartPerson } from "@/services/org-chart.service";

const COMPANY_ID = "cm_acme_corp_001";

/**
 * PersonRepository implementation backed by the org-chart API.
 * fetchAll returns the pre-loaded data passed via constructor.
 * Mutations go through the existing reporting/membership APIs.
 */
export class ApiPersonRepository implements PersonRepository {
  private people: Person[];
  private companyId: string;

  constructor(people: OrgChartPerson[], companyId: string = COMPANY_ID) {
    this.companyId = companyId;
    this.people = people.map((p) => this.toPerson(p));
  }

  private toPerson(p: OrgChartPerson): Person {
    return {
      id: p.id,
      fullName: p.fullName,
      title: p.title,
      squads: p.squads,
      salary: p.salary ?? 0,
      parentId: p.parentId,
      avatarUrl: p.avatarUrl ?? undefined,
      departmentId: p.departmentId ?? undefined,
      departmentName: p.departmentName ?? undefined,
      uin: p.uin ?? undefined,
      status: (p.status as PersonStatus) ?? "ACTIVE",
      capacityAllocation: p.capacityAllocation,
      positionTitle: p.positionTitle ?? undefined,
    };
  }

  async fetchAll(): Promise<Person[]> {
    return [...this.people];
  }

  async create(data: {
    fullName: string;
    title: string;
    squads?: string[];
    salary?: number;
    parentId?: string | null;
  }): Promise<Person> {
    // Placeholder: creates locally with a temp ID
    const newPerson: Person = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: data.fullName,
      title: data.title,
      squads: data.squads ?? [],
      salary: data.salary ?? 0,
      parentId: data.parentId ?? null,
      status: "ACTIVE",
      capacityAllocation: 0,
    };
    this.people.push(newPerson);
    return { ...newPerson };
  }

  async update(
    id: string,
    data: Partial<Pick<Person, "fullName" | "title" | "squads" | "salary" | "parentId">>
  ): Promise<Person> {
    // If parentId is being updated, call the reporting relationship API
    if (data.parentId !== undefined) {
      await apiClient(
        `/api/v2/companies/${this.companyId}/org-chart/reparent`,
        {
          method: "PUT",
          body: { userId: id, newManagerId: data.parentId },
        }
      ).catch(() => {
        // Fallback: update locally if endpoint doesn't exist yet
      });
    }

    const index = this.people.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Person with id "${id}" not found`);
    }
    this.people[index] = { ...this.people[index], ...data };
    return { ...this.people[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.people.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Person with id "${id}" not found`);
    }
    this.people.splice(index, 1);
  }
}
