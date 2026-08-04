import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@strata/database';

export interface SearchQuery {
  q?: string;
  departmentId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  id: string;
  type: 'person' | 'department' | 'squad';
  name: string;
  details: Record<string, unknown>;
}

export interface PaginatedSearchResult {
  data: SearchResult[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(query: SearchQuery): Promise<PaginatedSearchResult> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const searchTerm = query.q?.trim() || '';
    const entityType = query.type || 'all';

    const results: SearchResult[] = [];
    let total = 0;

    if (entityType === 'all' || entityType === 'person') {
      const personResults = await this.searchPersons(searchTerm, query);
      results.push(...personResults);
    }

    if (entityType === 'all' || entityType === 'department') {
      const departmentResults = await this.searchDepartments(searchTerm, query);
      results.push(...departmentResults);
    }

    if (entityType === 'all' || entityType === 'squad') {
      const squadResults = await this.searchSquads(searchTerm, query);
      results.push(...squadResults);
    }

    total = results.length;
    const paginatedData = results.slice(skip, skip + pageSize);

    return {
      data: paginatedData,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private async searchPersons(
    searchTerm: string,
    query: SearchQuery,
  ): Promise<SearchResult[]> {
    const where: any = {};

    if (searchTerm) {
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        {
          employees: {
            some: {
              position: {
                title: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    // Apply filters via employee relation
    if (query.departmentId || query.status || query.startDate || query.endDate) {
      const employeeFilter: any = {};

      if (query.departmentId) {
        employeeFilter.departmentId = query.departmentId;
      }
      if (query.status) {
        employeeFilter.status = query.status.toUpperCase();
      }
      if (query.startDate) {
        employeeFilter.startDate = { gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        employeeFilter.endDate = { lte: new Date(query.endDate) };
      }

      if (where.OR) {
        where.AND = [{ employees: { some: employeeFilter } }];
      } else {
        where.employees = { some: employeeFilter };
      }
    }

    const persons = await this.prisma.person.findMany({
      where,
      include: {
        employees: {
          include: {
            department: true,
            position: true,
          },
          take: 1,
        },
      },
      take: 200,
    });

    return persons.map((person) => {
      const employee = person.employees[0];
      return {
        id: person.id,
        type: 'person' as const,
        name: person.fullName,
        details: {
          email: person.email,
          department: employee?.department?.name || null,
          position: employee?.position?.title || null,
          status: employee?.status || null,
        },
      };
    });
  }

  private async searchDepartments(
    searchTerm: string,
    query: SearchQuery,
  ): Promise<SearchResult[]> {
    const where: any = {};

    if (searchTerm) {
      where.name = { contains: searchTerm, mode: 'insensitive' };
    }

    if (query.departmentId) {
      where.id = query.departmentId;
    }

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        _count: {
          select: { employees: true },
        },
        organization: true,
      },
      take: 200,
    });

    return departments.map((dept) => ({
      id: dept.id,
      type: 'department' as const,
      name: dept.name,
      details: {
        description: dept.description,
        organization: dept.organization.name,
        employeeCount: dept._count.employees,
      },
    }));
  }

  private async searchSquads(
    searchTerm: string,
    _query: SearchQuery,
  ): Promise<SearchResult[]> {
    const where: any = {};

    if (searchTerm) {
      where.name = { contains: searchTerm, mode: 'insensitive' };
    }

    const squads = await this.prisma.squad.findMany({
      where,
      include: {
        cluster: {
          include: { tribe: true },
        },
        _count: {
          select: { memberships: true },
        },
      },
      take: 200,
    });

    return squads.map((squad) => ({
      id: squad.id,
      type: 'squad' as const,
      name: squad.name,
      details: {
        cluster: squad.cluster.name,
        tribe: squad.cluster.tribe.name,
        memberCount: squad._count.memberships,
      },
    }));
  }
}
