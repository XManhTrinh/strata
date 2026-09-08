import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CapacityService } from '../capacity/capacity.service';

export interface CreateMemberDto {
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string;
  roleId?: string;
  metadata?: Record<string, string>;
}

export interface UpdateMemberDto {
  fullName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string;
  metadata?: Record<string, string>;
}

export interface ImportMemberDto {
  fullName: string;
  email: string;
  orgStructure?: string; // pipe-delimited: "Digital | Marketplace | PLP"
  orgLevelTypes?: string[]; // type name per level: ["Division", "Tribe", "Squad"]
  orgLevelIcons?: string[]; // icon per level: ["domain", "hub", "lan"]
  orgLevelColors?: string[]; // color per level: ["#6366F1", "#14B8A6", "#F59E0B"]
  position?: string;
  grade?: string;
  lineManagerEmail?: string; // kept for backward compat
  lineManagerIdentifier?: string; // the raw value from the CSV (could be email, UIN, name, etc.)
  lineManagerMatchField?: string; // "email" | "fullName" | any metadata key
  employmentType?: string;
  annualSalary?: string;
  dayRate?: string;
  roleId?: string;
  metadata?: Record<string, string>;
}

export interface MemberResponse {
  id: string;
  userId: string;
  membershipId: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string;
  isSuperAdmin: boolean;
  orgUnitId: string | null;
  orgUnitName: string | null;
  positionId: string | null;
  positionName: string | null;
  roles: { id: string; name: string }[];
  employmentType: string | null;
  annualSalary: number | null;
  dayRate: number | null;
  annualCost: number | null; // calculated: salary for Perm, dayRate × 228 for SubCon
  metadata: Record<string, string>;
  createdAt: string;
}

@Injectable()
export class CompanyPeopleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly capacityService: CapacityService,
  ) {}

  /**
   * List all members with metadata.
   */
  async findAll(
    companyId: string,
    options: { page?: number; pageSize?: number; search?: string } = {},
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 100;
    const skip = (page - 1) * pageSize;

    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId, isSuperAdmin: false },
      select: {
        id: true,
        userId: true,
        isSuperAdmin: true,
        orgUnitId: true,
        positionId: true,
        metadata: true,
        employmentType: true,
        annualSalary: true,
        dayRate: true,
        createdAt: true,
        orgUnit: { select: { name: true } },
        position: { select: { name: true } },
        roleAssignments: {
          select: { role: { select: { id: true, name: true } } },
        },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'asc' },
    });

    const userIds = memberships.map((m) => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let members: MemberResponse[] = memberships
      .map((m) => {
        const user = userMap.get(m.userId);
        const person = user?.person;
        if (!person) return null;

        return {
          id: person.id,
          userId: user.id,
          membershipId: m.id,
          fullName: person.fullName,
          email: person.email,
          phone: person.phone,
          address: person.address,
          dateOfBirth: person.dateOfBirth.toISOString(),
          isSuperAdmin: m.isSuperAdmin,
          orgUnitId: m.orgUnitId,
          orgUnitName: m.orgUnit?.name ?? null,
          positionId: m.positionId,
          positionName: m.position?.name ?? null,
          roles: m.roleAssignments.map((ra) => ({
            id: ra.role.id,
            name: ra.role.name,
          })),
          employmentType: m.employmentType,
          annualSalary: m.annualSalary ? Number(m.annualSalary) : null,
          dayRate: m.dayRate ? Number(m.dayRate) : null,
          annualCost: m.annualSalary
            ? Number(m.annualSalary)
            : m.dayRate
              ? Number(m.dayRate) * 228
              : null,
          metadata: (m.metadata as Record<string, string>) ?? {},
          createdAt: m.createdAt.toISOString(),
        };
      })
      .filter((m): m is MemberResponse => m !== null);

    if (options.search) {
      const q = options.search.toLowerCase();
      members = members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      );
    }

    members.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const total = await this.prisma.userCompanyMembership.count({
      where: { companyId, isSuperAdmin: false },
    });

    return { data: members, total, page, pageSize };
  }

  /**
   * Get a single member.
   */
  async findOne(companyId: string, personId: string): Promise<MemberResponse> {
    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new NotFoundException('Member not found');

    const user = await this.prisma.user.findFirst({ where: { personId } });
    if (!user) throw new NotFoundException('Member not found');

    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: { userId: user.id, companyId },
      select: {
        id: true,
        isSuperAdmin: true,
        orgUnitId: true,
        positionId: true,
        metadata: true,
        employmentType: true,
        annualSalary: true,
        dayRate: true,
        createdAt: true,
        orgUnit: { select: { name: true } },
        position: { select: { name: true } },
        roleAssignments: {
          select: { role: { select: { id: true, name: true } } },
        },
      },
    });
    if (!membership) throw new NotFoundException('Member not found in this workspace');

    return {
      id: person.id,
      userId: user.id,
      membershipId: membership.id,
      fullName: person.fullName,
      email: person.email,
      phone: person.phone,
      address: person.address,
      dateOfBirth: person.dateOfBirth.toISOString(),
      isSuperAdmin: membership.isSuperAdmin,
      orgUnitId: membership.orgUnitId,
      orgUnitName: membership.orgUnit?.name ?? null,
      positionId: membership.positionId,
      positionName: membership.position?.name ?? null,
      roles: membership.roleAssignments.map((ra) => ({
        id: ra.role.id,
        name: ra.role.name,
      })),
      employmentType: membership.employmentType,
      annualSalary: membership.annualSalary ? Number(membership.annualSalary) : null,
      dayRate: membership.dayRate ? Number(membership.dayRate) : null,
      annualCost: membership.annualSalary
        ? Number(membership.annualSalary)
        : membership.dayRate
          ? Number(membership.dayRate) * 228
          : null,
      metadata: (membership.metadata as Record<string, string>) ?? {},
      createdAt: membership.createdAt.toISOString(),
    };
  }

  /**
   * Add a new member.
   */
  async create(companyId: string, dto: CreateMemberDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existingUser) {
      const existing = await this.prisma.userCompanyMembership.findFirst({
        where: { userId: existingUser.id, companyId },
      });
      if (existing) {
        throw new ConflictException(`A member with email "${dto.email}" already exists in this workspace`);
      }
    }

    const person = await this.prisma.person.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : new Date('1970-01-01'),
      },
    });

    let user = existingUser;
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: dto.email, personId: person.id },
      });
    }

    const membership = await this.prisma.userCompanyMembership.create({
      data: {
        userId: user.id,
        companyId,
        isSuperAdmin: false,
        metadata: dto.metadata ?? {},
      },
    });

    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, companyId } });
      if (role) {
        await this.prisma.roleAssignment.create({
          data: { membershipId: membership.id, roleId: dto.roleId },
        });
      }
    }

    return this.findOne(companyId, person.id);
  }

  /**
   * Smart import: creates member + resolves org hierarchy + creates position if needed.
   */
  async importMember(companyId: string, dto: ImportMemberDto) {
    // Resolve org structure hierarchy
    let orgUnitId: string | null = null;
    if (dto.orgStructure) {
      orgUnitId = await this.resolveOrgHierarchy(companyId, dto.orgStructure, dto.orgLevelTypes, dto.orgLevelIcons, dto.orgLevelColors);
    }

    // Resolve career level / grade (before position, so we can set level range)
    let careerLevelId: string | null = null;
    if (dto.grade) {
      careerLevelId = await this.resolveCareerLevel(companyId, dto.grade);
    }

    // Resolve position (auto-expands min/max level range based on grade)
    let positionId: string | null = null;
    if (dto.position) {
      positionId = await this.resolvePosition(companyId, dto.position, careerLevelId);
    }

    // Check for existing user
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const existing = await this.prisma.userCompanyMembership.findFirst({
        where: { userId: existingUser.id, companyId },
      });
      if (existing) {
        // For duplicate emails with a different org unit, create additional
        // capacity allocation without overwriting the primary membership.
        const isSecondarySquad = orgUnitId && existing.orgUnitId && orgUnitId !== existing.orgUnitId;

        if (isSecondarySquad) {
          // Count existing allocations to compute split FTE
          const existingAllocations = await this.prisma.capacityAllocation.count({
            where: { companyId, membershipId: existing.id, fiscalYear: new Date().getFullYear() },
          });
          const splitFTE = parseFloat((1 / (existingAllocations + 1)).toFixed(2));

          // Create allocation for the new squad at split FTE
          await this.capacityService.createDefaultAllocation(
            companyId, existing.id, orgUnitId!, undefined, splitFTE,
          );

          // Update existing allocations to the same split FTE
          await this.prisma.capacityAllocation.updateMany({
            where: { companyId, membershipId: existing.id, fiscalYear: new Date().getFullYear() },
            data: {
              p1: splitFTE, p2: splitFTE, p3: splitFTE, p4: splitFTE,
              p5: splitFTE, p6: splitFTE, p7: splitFTE, p8: splitFTE,
              p9: splitFTE, p10: splitFTE, p11: splitFTE, p12: splitFTE,
            },
          });

          return { status: 'updated', email: dto.email, note: `split ${splitFTE} FTE across ${existingAllocations + 1} squads` };
        }

        // Update metadata for existing member (primary squad)
        await this.prisma.userCompanyMembership.update({
          where: { id: existing.id },
          data: {
            metadata: dto.metadata ?? {},
            orgUnitId: orgUnitId ?? existing.orgUnitId,
            positionId: positionId ?? existing.positionId,
            careerLevelId: careerLevelId ?? existing.careerLevelId,
            employmentType: dto.employmentType ?? existing.employmentType,
            annualSalary: dto.annualSalary ? parseFloat(dto.annualSalary) : existing.annualSalary,
            dayRate: dto.dayRate ? parseFloat(dto.dayRate) : existing.dayRate,
          },
        });
        // Update person name
        const user = await this.prisma.user.findUnique({
          where: { id: existingUser.id },
          select: { personId: true },
        });
        if (user?.personId) {
          await this.prisma.person.update({
            where: { id: user.personId },
            data: { fullName: dto.fullName },
          });
        }

        // Assign role if specified and not already assigned
        if (dto.roleId) {
          const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, companyId } });
          if (role) {
            const existingAssignment = await this.prisma.roleAssignment.findFirst({
              where: { membershipId: existing.id, roleId: dto.roleId },
            });
            if (!existingAssignment) {
              await this.prisma.roleAssignment.create({
                data: { membershipId: existing.id, roleId: dto.roleId },
              });
            }
          }
        }

        // Ensure capacity allocation exists for this member's org unit
        const effectiveOrgUnitId = orgUnitId ?? existing.orgUnitId;
        if (effectiveOrgUnitId) {
          await this.capacityService.createDefaultAllocation(companyId, existing.id, effectiveOrgUnitId);
        }

        return { status: 'updated', email: dto.email };
      }
    }

    // Create person
    const person = await this.prisma.person.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        dateOfBirth: new Date('1970-01-01'),
      },
    });

    let user = existingUser;
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: dto.email, personId: person.id },
      });
    }

    const newMembership = await this.prisma.userCompanyMembership.create({
      data: {
        userId: user.id,
        companyId,
        isSuperAdmin: false,
        orgUnitId,
        positionId,
        careerLevelId,
        employmentType: dto.employmentType ?? null,
        annualSalary: dto.annualSalary ? parseFloat(dto.annualSalary) : null,
        dayRate: dto.dayRate ? parseFloat(dto.dayRate) : null,
        metadata: dto.metadata ?? {},
      },
    });

    // Create default capacity allocation (1.0 FTE all periods)
    if (orgUnitId) {
      await this.capacityService.createDefaultAllocation(companyId, newMembership.id, orgUnitId);
    }

    // Assign role if specified
    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, companyId } });
      if (role) {
        await this.prisma.roleAssignment.create({
          data: { membershipId: newMembership.id, roleId: dto.roleId },
        });
      }
    }

    return { status: 'created', email: dto.email };
  }

  /**
   * Bulk import from CSV with column mapping.
   */
  async bulkImport(companyId: string, rows: ImportMemberDto[]) {
    const results: { status: string; email: string; error?: string }[] = [];

    // Phase 1: Create all members (without line manager)
    for (const row of rows) {
      try {
        const result = await this.importMember(companyId, row);
        results.push(result);
      } catch (err: any) {
        results.push({
          status: 'error',
          email: row.email,
          error: err.message || 'Unknown error',
        });
      }
    }

    // Phase 2: Resolve line manager relationships (all members exist now)
    for (const row of rows) {
      // Support both legacy lineManagerEmail and the new flexible identifier
      const identifier = row.lineManagerIdentifier || row.lineManagerEmail;
      if (!identifier) continue;
      const matchField = row.lineManagerMatchField || 'email';
      try {
        await this.resolveLineManager(companyId, row.email, identifier, matchField);
      } catch {
        // Silently skip — manager might not exist
      }
    }

    return {
      total: rows.length,
      created: results.filter((r) => r.status === 'created').length,
      updated: results.filter((r) => r.status === 'updated').length,
      errors: results.filter((r) => r.status === 'error'),
    };
  }

  /**
   * Update a member.
   */
  async update(companyId: string, personId: string, dto: UpdateMemberDto) {
    const member = await this.findOne(companyId, personId);

    await this.prisma.person.update({
      where: { id: personId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
      },
    });

    if (dto.metadata !== undefined) {
      await this.prisma.userCompanyMembership.update({
        where: { id: member.membershipId },
        data: { metadata: dto.metadata },
      });
    }

    return this.findOne(companyId, personId);
  }

  /**
   * Remove a member. Super admins cannot be deleted.
   */
  async remove(companyId: string, personId: string) {
    const member = await this.findOne(companyId, personId);

    if (member.isSuperAdmin) {
      throw new ForbiddenException('Super admins cannot be removed');
    }

    await this.prisma.roleAssignment.deleteMany({
      where: { membershipId: member.membershipId },
    });

    await this.prisma.userCompanyMembership.delete({
      where: { id: member.membershipId },
    });

    const remaining = await this.prisma.userCompanyMembership.count({
      where: { userId: member.userId },
    });

    if (remaining === 0) {
      await this.prisma.apiKey.deleteMany({ where: { userId: member.userId } });
      await this.prisma.user.delete({ where: { id: member.userId } });
      await this.prisma.person.delete({ where: { id: personId } });
    }

    return { deleted: true };
  }

  /**
   * Delete all non-super-admin members from a workspace.
   */
  async removeAll(companyId: string) {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId, isSuperAdmin: false },
      select: { id: true, userId: true },
    });

    let removedCount = 0;

    for (const m of memberships) {
      await this.prisma.roleAssignment.deleteMany({ where: { membershipId: m.id } });
      await this.prisma.userCompanyMembership.delete({ where: { id: m.id } });

      const remaining = await this.prisma.userCompanyMembership.count({
        where: { userId: m.userId },
      });

      if (remaining === 0) {
        const user = await this.prisma.user.findUnique({
          where: { id: m.userId },
          select: { personId: true },
        });
        await this.prisma.apiKey.deleteMany({ where: { userId: m.userId } });
        await this.prisma.user.delete({ where: { id: m.userId } });
        if (user?.personId) {
          await this.prisma.person.delete({ where: { id: user.personId } }).catch(() => {});
        }
      }
      removedCount++;
    }

    return { removed: removedCount };
  }

  /**
   * Assign a role to a member.
   */
  async assignRole(companyId: string, personId: string, roleId: string) {
    const member = await this.findOne(companyId, personId);
    const role = await this.prisma.role.findFirst({ where: { id: roleId, companyId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.roleAssignment.findFirst({
      where: { membershipId: member.membershipId, roleId },
    });
    if (existing) throw new ConflictException('Role already assigned');

    await this.prisma.roleAssignment.create({
      data: { membershipId: member.membershipId, roleId },
    });

    return this.findOne(companyId, personId);
  }

  /**
   * Remove a role from a member.
   */
  async removeRole(companyId: string, personId: string, roleId: string) {
    const member = await this.findOne(companyId, personId);
    await this.prisma.roleAssignment.deleteMany({
      where: { membershipId: member.membershipId, roleId },
    });
    return this.findOne(companyId, personId);
  }

  /**
   * Get all unique metadata keys across a company's members.
   * Used to dynamically build table columns.
   */
  async getMetadataKeys(companyId: string): Promise<string[]> {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId, metadata: { not: {} } },
      select: { metadata: true },
    });

    const keys = new Set<string>();
    for (const m of memberships) {
      if (m.metadata && typeof m.metadata === 'object') {
        Object.keys(m.metadata as Record<string, unknown>).forEach((k) => keys.add(k));
      }
    }

    return Array.from(keys).sort();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Resolves a pipe-delimited org structure path into an org unit ID.
   * Creates missing org units along the way.
   * e.g., "Digital | Marketplace | PLP" → creates hierarchy and returns PLP's ID.
   */
  /**
   * Resolves a line manager relationship between a member and their manager.
   *
   * The manager is identified by `managerIdentifier` matched against the field
   * specified by `matchField`:
   *   - "email"    → User.email
   *   - "fullName" → Person.fullName
   *   - anything else → treated as a metadata key on UserCompanyMembership
   */
  private async resolveLineManager(
    companyId: string,
    memberEmail: string,
    managerIdentifier: string,
    matchField: string = 'email',
  ): Promise<void> {
    // Find member's user
    const memberUser = await this.prisma.user.findUnique({
      where: { email: memberEmail },
      select: { id: true },
    });
    if (!memberUser) return;

    // Find member's membership
    const memberMembership = await this.prisma.userCompanyMembership.findFirst({
      where: { userId: memberUser.id, companyId },
      select: { id: true },
    });
    if (!memberMembership) return;

    // Find manager's user based on the match field
    let managerUserId: string | undefined;

    if (matchField === 'email') {
      const managerUser = await this.prisma.user.findUnique({
        where: { email: managerIdentifier },
        select: { id: true },
      });
      managerUserId = managerUser?.id;
    } else if (matchField === 'fullName') {
      // Look up by person name → user (case-insensitive)
      const person = await this.prisma.person.findFirst({
        where: {
          fullName: { equals: managerIdentifier, mode: 'insensitive' },
        },
        select: { user: { select: { id: true } } },
      });
      managerUserId = person?.user?.id;
    } else {
      // Treat as metadata key — search memberships in this company
      const memberships = await this.prisma.userCompanyMembership.findMany({
        where: { companyId, isSuperAdmin: false },
        select: { userId: true, metadata: true },
      });
      const match = memberships.find((m) => {
        const meta = (m.metadata as Record<string, string>) ?? {};
        const val = meta[matchField];
        return val?.toLowerCase() === managerIdentifier.toLowerCase();
      });
      managerUserId = match?.userId;
    }

    if (!managerUserId) return;

    // Verify manager has a membership in this company
    const managerMembership = await this.prisma.userCompanyMembership.findFirst({
      where: { userId: managerUserId, companyId },
      select: { id: true },
    });
    if (!managerMembership) return;

    // Create or update reporting relationship
    const existing = await this.prisma.reportingRelationship.findFirst({
      where: { companyId, userId: memberUser.id },
    });

    if (existing) {
      await this.prisma.reportingRelationship.update({
        where: { id: existing.id },
        data: { managerId: managerUserId },
      });
    } else {
      await this.prisma.reportingRelationship.create({
        data: {
          companyId,
          userId: memberUser.id,
          managerId: managerUserId,
        },
      });
    }

    // Auto-set canHaveDirectReports on the manager's position
    const managerFullMembership = await this.prisma.userCompanyMembership.findFirst({
      where: { userId: managerUserId, companyId },
      select: { positionId: true },
    });
    if (managerFullMembership?.positionId) {
      await this.prisma.position.update({
        where: { id: managerFullMembership.positionId },
        data: { canHaveDirectReports: true },
      });
    }
  }

  private async resolveOrgHierarchy(
    companyId: string,
    path: string,
    levelTypes?: string[],
    levelIcons?: string[],
    levelColors?: string[],
  ): Promise<string> {
    const parts = path.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) throw new BadRequestException('Invalid org structure path');

    let currentParentId: string | null = null;

    for (let i = 0; i < parts.length; i++) {
      const unitName = parts[i];
      const typeName = levelTypes?.[i] || 'Department';
      const typeIcon = levelIcons?.[i];
      const typeColor = levelColors?.[i];
      const typeId = await this.resolveOrgUnitType(companyId, typeName, typeIcon, typeColor);
      currentParentId = await this.findOrCreateOrgUnit(companyId, typeId, unitName, currentParentId);
    }

    return currentParentId!;
  }

  private async resolveOrgUnitType(companyId: string, name: string, icon?: string, color?: string): Promise<string> {
    const existing = await this.prisma.organizationUnitType.findFirst({
      where: { companyId, name },
      select: { id: true },
    });
    if (existing) return existing.id;

    // Auto-assign a color based on the type name (if not provided)
    const defaultColors: Record<string, string> = {
      division: '#6366F1',
      cfu: '#8B5CF6',
      tribe: '#0EA5E9',
      cluster: '#14B8A6',
      squad: '#F59E0B',
      team: '#10B981',
      department: '#3B82F6',
      group: '#EC4899',
      unit: '#64748B',
    };
    const resolvedColor = color || defaultColors[name.toLowerCase()] || '#6B7280';

    const created = await this.prisma.organizationUnitType.create({
      data: { companyId, name, color: resolvedColor, icon: icon || null },
      select: { id: true },
    });
    return created.id;
  }

  private async findOrCreateOrgUnit(
    companyId: string,
    typeId: string,
    name: string,
    parentId: string | null,
  ): Promise<string> {
    // Match by name AND parent — null means root level (use explicit null, not undefined)
    const existing = await this.prisma.organizationUnit.findFirst({
      where: { companyId, name, parentId: parentId === null ? null : parentId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.organizationUnit.create({
      data: { companyId, name, typeId, parentId },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Resolves a position name to a position ID, creating if needed.
   * If a careerLevelId is provided, auto-expands the position's min/max level range.
   */
  private async resolvePosition(
    companyId: string,
    name: string,
    careerLevelId?: string | null,
  ): Promise<string> {
    let position = await this.prisma.position.findFirst({
      where: { companyId, name },
      include: { minLevel: true, maxLevel: true },
    });

    if (!position) {
      position = await this.prisma.position.create({
        data: {
          companyId,
          name,
          minLevelId: careerLevelId ?? undefined,
          maxLevelId: careerLevelId ?? undefined,
        },
        include: { minLevel: true, maxLevel: true },
      });
      return position.id;
    }

    // Auto-expand the level range if needed
    if (careerLevelId) {
      const level = await this.prisma.careerLevel.findUnique({
        where: { id: careerLevelId },
      });
      if (level) {
        const updates: Record<string, string> = {};

        // Expand min if new level is lower
        if (!position.minLevel || level.rank < position.minLevel.rank) {
          updates.minLevelId = careerLevelId;
        }
        // Expand max if new level is higher
        if (!position.maxLevel || level.rank > position.maxLevel.rank) {
          updates.maxLevelId = careerLevelId;
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.position.update({
            where: { id: position.id },
            data: updates,
          });
        }
      }
    }

    return position.id;
  }

  /**
   * Resolves a career level label (e.g. "L3", "L5") to a CareerLevel ID.
   * Auto-creates the CareerLevelScheme and level if needed.
   */
  private async resolveCareerLevel(companyId: string, label: string): Promise<string> {
    // Get or create the company's career level scheme
    let scheme = await this.prisma.careerLevelScheme.findUnique({
      where: { companyId },
    });
    if (!scheme) {
      scheme = await this.prisma.careerLevelScheme.create({
        data: { companyId, type: 'numeric' },
      });
    }

    // Find existing level by label
    const existing = await this.prisma.careerLevel.findFirst({
      where: { schemeId: scheme.id, label },
    });
    if (existing) return existing.id;

    // Extract rank from label (e.g. "L5" → 5, "L10" → 10)
    const numMatch = label.match(/\d+/);
    const rank = numMatch ? parseInt(numMatch[0], 10) : 0;

    const created = await this.prisma.careerLevel.create({
      data: {
        schemeId: scheme.id,
        label,
        displayName: label,
        rank,
      },
    });

    return created.id;
  }
}
