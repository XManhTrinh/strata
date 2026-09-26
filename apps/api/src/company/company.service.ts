import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';

export interface UpdateCompanyDto {
  name?: string;
  slug?: string;
  settings?: Record<string, unknown>;
}

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            roles: true,
            positions: true,
            organizationUnits: true,
            organizationUnitTypes: true,
          },
        },
      },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Members excludes the super admin (account creator) — they are not staff.
    const members = await this.prisma.userCompanyMembership.count({
      where: { companyId, isSuperAdmin: false },
    });

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      settings: company.settings ?? {},
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      stats: {
        members,
        roles: company._count.roles,
        positions: company._count.positions,
        orgUnits: company._count.organizationUnits,
        orgUnitTypes: company._count.organizationUnitTypes,
      },
    };
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== company.slug) {
      const existing = await this.prisma.company.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) throw new ConflictException('Slug already in use');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.settings !== undefined) data.settings = dto.settings;

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      settings: updated.settings ?? {},
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Reset all company data except the company record and super admin accounts.
   * Deletes in correct FK order to avoid constraint violations.
   */
  async resetAllData(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Get super admin membership IDs to preserve
    const superAdminMemberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId, isSuperAdmin: true },
      select: { id: true, userId: true },
    });
    const preservedMembershipIds = superAdminMemberships.map((m) => m.id);
    const preservedUserIds = superAdminMemberships.map((m) => m.userId);

    // Delete in FK-safe order (children first)
    // 1. Capacity allocations
    await this.prisma.capacityAllocation.deleteMany({ where: { companyId } });

    // 2. Rate cards
    await this.prisma.rateCard.deleteMany({ where: { companyId } });

    // 3. Calendar: leave balances, accrual policies, leave requests → events
    await this.prisma.leaveBalance.deleteMany({ where: { companyId } });
    await this.prisma.accrualPolicy.deleteMany({ where: { companyId } });
    const calendarEvents = await this.prisma.calendarEvent.findMany({
      where: { companyId },
      select: { id: true },
    });
    if (calendarEvents.length > 0) {
      await this.prisma.calendarLeaveRequest.deleteMany({
        where: { calendarEventId: { in: calendarEvents.map((e) => e.id) } },
      });
      await this.prisma.calendarEvent.deleteMany({ where: { companyId } });
    }
    await this.prisma.leaveTypeConfig.deleteMany({ where: { companyId } });
    await this.prisma.eventType.deleteMany({ where: { companyId } });

    // 4. Role assignments (for non-super-admin memberships)
    await this.prisma.roleAssignment.deleteMany({
      where: {
        membership: { companyId },
        membershipId: { notIn: preservedMembershipIds },
      },
    });

    // 5. Role permissions → Roles
    const roles = await this.prisma.role.findMany({
      where: { companyId },
      select: { id: true },
    });
    if (roles.length > 0) {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: { in: roles.map((r) => r.id) } },
      });
    }
    await this.prisma.role.deleteMany({ where: { companyId } });

    // 6. Company features
    await this.prisma.companyFeature.deleteMany({ where: { companyId } });

    // 7. Reporting relationships
    await this.prisma.reportingRelationship.deleteMany({ where: { companyId } });

    // 8. Table views
    await this.prisma.tableView.deleteMany({ where: { companyId } });

    // 9. Non-super-admin memberships
    await this.prisma.userCompanyMembership.deleteMany({
      where: { companyId, id: { notIn: preservedMembershipIds } },
    });

    // 10. Org units → Org unit types
    await this.prisma.organizationUnit.deleteMany({ where: { companyId } });
    await this.prisma.organizationUnitType.deleteMany({ where: { companyId } });

    // 11. Positions
    await this.prisma.position.deleteMany({ where: { companyId } });

    // 12. Career levels → scheme
    const scheme = await this.prisma.careerLevelScheme.findUnique({
      where: { companyId },
    });
    if (scheme) {
      await this.prisma.careerLevel.deleteMany({ where: { schemeId: scheme.id } });
      await this.prisma.careerLevelScheme.delete({ where: { companyId } });
    }

    // 13. Non-super-admin users + persons (who are not in any other company)
    const nonAdminUsers = await this.prisma.user.findMany({
      where: {
        id: { notIn: preservedUserIds },
        // Only delete users who had a membership in this company
      },
      include: {
        _count: { select: { apiKeys: true } },
      },
    });

    // Only delete users who have no remaining memberships in ANY company
    for (const user of nonAdminUsers) {
      const remainingMemberships = await this.prisma.userCompanyMembership.count({
        where: { userId: user.id },
      });
      if (remainingMemberships === 0) {
        await this.prisma.apiKey.deleteMany({ where: { userId: user.id } });
        await this.prisma.user.delete({ where: { id: user.id } });
        await this.prisma.person.delete({ where: { id: user.personId } }).catch(() => {});
      }
    }

    return {
      status: 'reset',
      preserved: {
        superAdmins: preservedMembershipIds.length,
      },
    };
  }
}
