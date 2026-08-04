import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, PermissionScopeV2 } from '@strata/database';
import { FeatureRegistryService } from '../feature-registry/feature-registry.service';

/**
 * Scope mapping: old PermissionScope → new PermissionScopeV2
 */
const SCOPE_MAPPING: Record<string, PermissionScopeV2> = {
  SELF: 'OWN' as PermissionScopeV2,
  TEAM: 'DIRECT_REPORTS' as PermissionScopeV2,
  ORGANIZATION: 'COMPANY' as PermissionScopeV2,
};

export interface MigrationReport {
  companiesCreated: number;
  orgUnitTypesCreated: number;
  orgUnitsCreated: number;
  membershipsCreated: number;
  positionsCreated: number;
  featuresRegistered: number;
  featurePermissionsCreated: number;
  rolesCreated: number;
  rolePermissionsCreated: number;
  roleAssignmentsCreated: number;
  unmappedScopes: string[];
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Migration service that converts data from the legacy permission system (v1)
 * to the new scalable authorization system (v2).
 *
 * Migration steps:
 * 1. Create Company from existing Organization
 * 2. Create OrganizationUnitTypes for existing structures (Department, Tribe, Cluster, Squad)
 * 3. Convert Department hierarchy → OrganizationUnit with materialized paths
 * 4. Convert Tribe/Cluster/Squad → OrganizationUnit with nesting
 * 5. Create UserCompanyMembership records
 * 6. Migrate Position → PositionV2 (detach from department, scope to company)
 * 7. Register Features from existing permission resource values
 * 8. Create FeaturePermissions from existing action values per feature
 * 9. Migrate Role → RoleV2 preserving names/descriptions
 * 10. Migrate RolePermission → RolePermissionAssignment with scope mapping
 * 11. Migrate RoleAssignment → RoleAssignmentV2 linked to membership
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private report: MigrationReport;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly featureRegistry: FeatureRegistryService,
  ) {
    this.report = this.createEmptyReport();
  }

  /**
   * Runs the full migration for a specific company (organization) or all.
   */
  async migrate(companyId?: string): Promise<MigrationReport> {
    this.report = this.createEmptyReport();
    this.report.startedAt = new Date();

    try {
      // Step 1: Create Company from Organization
      const organizations = companyId
        ? await this.prisma.organization.findMany({
            where: { id: companyId },
          })
        : await this.prisma.organization.findMany();

      for (const org of organizations) {
        await this.migrateOrganization(org);
      }

      this.report.completedAt = new Date();
      this.logger.log('Migration completed successfully');
    } catch (error) {
      this.report.errors.push(`Migration failed: ${error}`);
      this.logger.error(`Migration failed: ${error}`);
    }

    return this.report;
  }

  /**
   * Generates a report without performing any writes (dry-run mode).
   */
  async generateReport(companyId?: string): Promise<MigrationReport> {
    const report = this.createEmptyReport();
    report.startedAt = new Date();

    try {
      const organizations = companyId
        ? await this.prisma.organization.findMany({ where: { id: companyId } })
        : await this.prisma.organization.findMany();

      report.companiesCreated = organizations.length;

      // Count departments across organizations
      const orgIds = organizations.map((o) => o.id);
      const departments = await this.prisma.department.count({
        where: { organizationId: { in: orgIds } },
      });

      // Count tribes, clusters, squads
      const tribes = await this.prisma.tribe.count({
        where: { organizationId: { in: orgIds } },
      });
      const clusters = await this.prisma.cluster.count({
        where: { tribe: { organizationId: { in: orgIds } } },
      });
      const squads = await this.prisma.squad.count({
        where: { cluster: { tribe: { organizationId: { in: orgIds } } } },
      });

      report.orgUnitTypesCreated = 4; // Department, Tribe, Cluster, Squad
      report.orgUnitsCreated = departments + tribes + clusters + squads;

      // Count employees/users for membership
      const employees = await this.prisma.employee.count({
        where: { organizationId: { in: orgIds } },
      });
      report.membershipsCreated = employees;

      // Count positions
      const positions = await this.prisma.position.count({
        where: { department: { organizationId: { in: orgIds } } },
      });
      report.positionsCreated = positions;

      // Count existing permissions (resource values = features)
      const permissions = await this.prisma.permission.findMany();
      const uniqueResources = new Set(permissions.map((p) => p.resource));
      report.featuresRegistered = uniqueResources.size;
      report.featurePermissionsCreated = permissions.length;

      // Count roles
      const roles = await this.prisma.role.count();
      report.rolesCreated = roles;

      // Count role permissions
      const rolePermissions = await this.prisma.rolePermission.count();
      report.rolePermissionsCreated = rolePermissions;

      // Count role assignments
      const roleAssignments = await this.prisma.roleAssignment.count();
      report.roleAssignmentsCreated = roleAssignments;

      report.completedAt = new Date();
    } catch (error) {
      report.errors.push(`Report generation failed: ${error}`);
    }

    return report;
  }

  // ─── Private Migration Steps ─────────────────────────────────────────────

  private async migrateOrganization(org: { id: string; name: string }) {
    // Step 1: Create Company
    const slug = org.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const company = await this.prisma.company.upsert({
      where: { legacyOrganizationId: org.id },
      create: {
        name: org.name,
        slug: slug,
        legacyOrganizationId: org.id,
      },
      update: {
        name: org.name,
      },
    });
    this.report.companiesCreated++;

    // Step 2: Create OrgUnitTypes
    const orgUnitTypes = await this.createOrgUnitTypes(company.id);

    // Step 3: Convert Departments → OrganizationUnits
    await this.migrateDepartments(org.id, company.id, orgUnitTypes.department);

    // Step 4: Convert Tribe/Cluster/Squad → OrganizationUnits
    await this.migrateEngineeringHierarchy(
      org.id,
      company.id,
      orgUnitTypes.tribe,
      orgUnitTypes.cluster,
      orgUnitTypes.squad,
    );

    // Step 5: Create UserCompanyMembership
    await this.createMemberships(org.id, company.id);

    // Step 6: Migrate Position → PositionV2
    await this.migratePositions(org.id, company.id);

    // Step 7 & 8: Register Features and FeaturePermissions
    await this.migratePermissionsToFeatures();

    // Step 9: Migrate Role → RoleV2
    await this.migrateRoles(company.id);

    // Step 10: Migrate RolePermission → RolePermissionAssignment
    await this.migrateRolePermissions(company.id);

    // Step 11: Migrate RoleAssignment → RoleAssignmentV2
    await this.migrateRoleAssignments(company.id);
  }

  private async createOrgUnitTypes(companyId: string) {
    const types = [
      { name: 'Department', description: 'Organizational department', displayOrder: 1 },
      { name: 'Tribe', description: 'Engineering tribe', displayOrder: 2 },
      { name: 'Cluster', description: 'Engineering cluster', displayOrder: 3 },
      { name: 'Squad', description: 'Engineering squad', displayOrder: 4 },
    ];

    const result: Record<string, string> = {};

    for (const type of types) {
      const created = await this.prisma.organizationUnitType.upsert({
        where: { companyId_name: { companyId, name: type.name } },
        create: {
          companyId,
          name: type.name,
          description: type.description,
          displayOrder: type.displayOrder,
        },
        update: {
          description: type.description,
          displayOrder: type.displayOrder,
        },
      });
      result[type.name.toLowerCase()] = created.id;
      this.report.orgUnitTypesCreated++;
    }

    return result;
  }

  private async migrateDepartments(
    orgId: string,
    companyId: string,
    typeId: string,
  ) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { parentId: 'asc' }, // Process parents first
    });

    // Map old department ID → new org unit ID
    const idMap = new Map<string, string>();

    // First pass: create without parentId to get all IDs
    for (const dept of departments) {
      const orgUnit = await this.prisma.organizationUnit.create({
        data: {
          companyId,
          typeId,
          name: dept.name,
          code: dept.id, // Store legacy ID as code for reference
          path: '/',
        },
      });
      idMap.set(dept.id, orgUnit.id);
      this.report.orgUnitsCreated++;
    }

    // Second pass: set parent relationships and materialized paths
    for (const dept of departments) {
      if (dept.parentId && idMap.has(dept.parentId)) {
        const unitId = idMap.get(dept.id)!;
        const parentUnitId = idMap.get(dept.parentId)!;
        const parentPath = await this.getOrgUnitPath(parentUnitId);

        await this.prisma.organizationUnit.update({
          where: { id: unitId },
          data: {
            parentId: parentUnitId,
            path: `${parentPath}${parentUnitId}/`,
          },
        });
      }
    }
  }

  private async migrateEngineeringHierarchy(
    orgId: string,
    companyId: string,
    tribeTypeId: string,
    clusterTypeId: string,
    squadTypeId: string,
  ) {
    const tribes = await this.prisma.tribe.findMany({
      where: { organizationId: orgId },
      include: {
        clusters: {
          include: { squads: true },
        },
      },
    });

    for (const tribe of tribes) {
      const tribeUnit = await this.prisma.organizationUnit.create({
        data: {
          companyId,
          typeId: tribeTypeId,
          name: tribe.name,
          code: tribe.id,
          path: '/',
        },
      });
      this.report.orgUnitsCreated++;

      for (const cluster of tribe.clusters) {
        const clusterUnit = await this.prisma.organizationUnit.create({
          data: {
            companyId,
            typeId: clusterTypeId,
            name: cluster.name,
            code: cluster.id,
            parentId: tribeUnit.id,
            path: `/${tribeUnit.id}/`,
          },
        });
        this.report.orgUnitsCreated++;

        for (const squad of cluster.squads) {
          await this.prisma.organizationUnit.create({
            data: {
              companyId,
              typeId: squadTypeId,
              name: squad.name,
              code: squad.id,
              parentId: clusterUnit.id,
              path: `/${tribeUnit.id}/${clusterUnit.id}/`,
            },
          });
          this.report.orgUnitsCreated++;
        }
      }
    }
  }

  private async createMemberships(orgId: string, companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId: orgId },
      include: { person: { include: { user: true } } },
    });

    for (const emp of employees) {
      if (!emp.person?.user) continue;

      const userId = emp.person.user.id;

      // Check if membership already exists
      const existing = await this.prisma.userCompanyMembership.findUnique({
        where: { userId_companyId: { userId, companyId } },
      });
      if (existing) continue;

      await this.prisma.userCompanyMembership.create({
        data: {
          userId,
          companyId,
        },
      });
      this.report.membershipsCreated++;
    }
  }

  private async migratePositions(orgId: string, companyId: string) {
    const positions = await this.prisma.position.findMany({
      where: { department: { organizationId: orgId } },
    });

    for (const pos of positions) {
      // Upsert by company + title (since PositionV2 has unique [companyId, name])
      await this.prisma.positionV2.upsert({
        where: { companyId_name: { companyId, name: pos.title } },
        create: {
          companyId,
          name: pos.title,
          description: pos.description,
          careerLevel: pos.level,
        },
        update: {
          description: pos.description,
          careerLevel: pos.level,
        },
      });
      this.report.positionsCreated++;
    }
  }

  private async migratePermissionsToFeatures() {
    // Get all unique permission (resource, action) pairs
    const permissions = await this.prisma.permission.findMany();

    // Group by resource (resource → feature)
    const featureMap = new Map<string, Set<string>>();
    for (const perm of permissions) {
      if (!featureMap.has(perm.resource)) {
        featureMap.set(perm.resource, new Set());
      }
      featureMap.get(perm.resource)!.add(perm.action);
    }

    // Register each resource as a Feature
    for (const [resource, actions] of featureMap) {
      const definition = {
        key: resource,
        displayName: resource.charAt(0).toUpperCase() + resource.slice(1),
        description: `Migrated from legacy permission resource: ${resource}`,
        permissions: Array.from(actions).map((action) => ({
          key: action,
          displayName: action.charAt(0).toUpperCase() + action.slice(1),
          description: `Migrated from legacy permission action: ${action}`,
        })),
      };

      await this.featureRegistry.register(definition);
      this.report.featuresRegistered++;
      this.report.featurePermissionsCreated += actions.size;
    }
  }

  private async migrateRoles(companyId: string) {
    const roles = await this.prisma.role.findMany();

    for (const role of roles) {
      await this.prisma.roleV2.upsert({
        where: { companyId_name: { companyId, name: role.name } },
        create: {
          companyId,
          name: role.name,
          description: role.description,
        },
        update: {
          description: role.description,
        },
      });
      this.report.rolesCreated++;
    }
  }

  private async migrateRolePermissions(companyId: string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      include: {
        role: true,
        permission: true,
      },
    });

    for (const rp of rolePermissions) {
      // Find the corresponding RoleV2
      const roleV2 = await this.prisma.roleV2.findUnique({
        where: { companyId_name: { companyId, name: rp.role.name } },
      });
      if (!roleV2) {
        this.report.errors.push(
          `Could not find RoleV2 for legacy role: ${rp.role.name}`,
        );
        continue;
      }

      // Find the corresponding FeaturePermission
      const feature = await this.prisma.feature.findUnique({
        where: { key: rp.permission.resource },
      });
      if (!feature) {
        this.report.errors.push(
          `Could not find Feature for resource: ${rp.permission.resource}`,
        );
        continue;
      }

      const featurePermission = await this.prisma.featurePermission.findUnique({
        where: {
          featureId_key: { featureId: feature.id, key: rp.permission.action },
        },
      });
      if (!featurePermission) {
        this.report.errors.push(
          `Could not find FeaturePermission for ${rp.permission.resource}:${rp.permission.action}`,
        );
        continue;
      }

      // We use COMPANY as default scope for role permissions (since the legacy
      // system assigns scope at the RoleAssignment level, not at the permission level)
      const scope: PermissionScopeV2 = 'COMPANY' as PermissionScopeV2;

      try {
        await this.prisma.rolePermissionAssignment.upsert({
          where: {
            roleId_featurePermissionId_scope: {
              roleId: roleV2.id,
              featurePermissionId: featurePermission.id,
              scope,
            },
          },
          create: {
            roleId: roleV2.id,
            featurePermissionId: featurePermission.id,
            scope,
          },
          update: {},
        });
        this.report.rolePermissionsCreated++;
      } catch (error) {
        this.report.errors.push(
          `Failed to create RolePermissionAssignment: ${error}`,
        );
      }
    }
  }

  private async migrateRoleAssignments(companyId: string) {
    const assignments = await this.prisma.roleAssignment.findMany({
      include: { role: true },
    });

    for (const assignment of assignments) {
      // Find user membership
      const membership = await this.prisma.userCompanyMembership.findUnique({
        where: {
          userId_companyId: { userId: assignment.userId, companyId },
        },
      });
      if (!membership) {
        this.report.errors.push(
          `No membership found for user ${assignment.userId} in company ${companyId}`,
        );
        continue;
      }

      // Find the corresponding RoleV2
      const roleV2 = await this.prisma.roleV2.findUnique({
        where: { companyId_name: { companyId, name: assignment.role.name } },
      });
      if (!roleV2) {
        this.report.errors.push(
          `Could not find RoleV2 for legacy role: ${assignment.role.name}`,
        );
        continue;
      }

      // Map scope and log if unmapped
      const mappedScope = SCOPE_MAPPING[assignment.scope];
      if (!mappedScope) {
        this.report.unmappedScopes.push(assignment.scope);
      }

      try {
        await this.prisma.roleAssignmentV2.upsert({
          where: {
            membershipId_roleId: {
              membershipId: membership.id,
              roleId: roleV2.id,
            },
          },
          create: {
            membershipId: membership.id,
            roleId: roleV2.id,
            assignedBy: 'migration',
          },
          update: {},
        });
        this.report.roleAssignmentsCreated++;
      } catch (error) {
        this.report.errors.push(
          `Failed to create RoleAssignmentV2: ${error}`,
        );
      }
    }
  }

  private async getOrgUnitPath(unitId: string): Promise<string> {
    const unit = await this.prisma.organizationUnit.findUnique({
      where: { id: unitId },
      select: { path: true },
    });
    return unit?.path ?? '/';
  }

  private createEmptyReport(): MigrationReport {
    return {
      companiesCreated: 0,
      orgUnitTypesCreated: 0,
      orgUnitsCreated: 0,
      membershipsCreated: 0,
      positionsCreated: 0,
      featuresRegistered: 0,
      featurePermissionsCreated: 0,
      rolesCreated: 0,
      rolePermissionsCreated: 0,
      roleAssignmentsCreated: 0,
      unmappedScopes: [],
      errors: [],
      startedAt: new Date(),
    };
  }
}
