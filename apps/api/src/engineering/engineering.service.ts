import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { EngineeringDomain } from './engineering.domain';
import { EngineeringRepository } from './engineering.repository';

@Injectable()
export class EngineeringService {
  constructor(
    private readonly domain: EngineeringDomain,
    private readonly repository: EngineeringRepository,
    private readonly prisma: PrismaClient,
  ) {}

  // ─── Tribe Methods ────────────────────────────────────────────────────────

  async createTribe(body: unknown, userId: string) {
    const validated = this.domain.validateCreateTribe(body);

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: validated.organizationId },
    });
    if (!organization) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'organizationId',
            message: `Organization with id "${validated.organizationId}" does not exist`,
          },
        ],
      });
    }

    const tribe = await this.repository.createTribe(validated);

    await this.createAuditRecord(userId, 'Tribe', tribe.id, 'CREATE', {
      after: tribe,
    });

    return tribe;
  }

  async findAllTribes(organizationId?: string) {
    return this.repository.findAllTribes(organizationId);
  }

  async findTribeById(id: string) {
    return this.repository.findTribeById(id);
  }

  async updateTribe(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdateTribe(body);

    const existing = await this.repository.findTribeById(id);

    const updated = await this.repository.updateTribe(id, validated);

    await this.createAuditRecord(userId, 'Tribe', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deleteTribe(id: string, userId: string) {
    const existing = await this.repository.findTribeById(id);

    const result = await this.repository.deleteTribe(id);

    await this.createAuditRecord(userId, 'Tribe', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Cluster Methods ──────────────────────────────────────────────────────

  async createCluster(body: unknown, userId: string) {
    const validated = this.domain.validateCreateCluster(body);

    // Validate hierarchy: Cluster must have valid tribeId
    const tribeExists = await this.repository.tribeExists(validated.tribeId);
    this.domain.validateParentExists(validated.tribeId, 'Tribe', tribeExists);

    const cluster = await this.repository.createCluster(validated);

    await this.createAuditRecord(userId, 'Cluster', cluster.id, 'CREATE', {
      after: cluster,
    });

    return cluster;
  }

  async findAllClusters(tribeId?: string) {
    return this.repository.findAllClusters(tribeId);
  }

  async findClusterById(id: string) {
    return this.repository.findClusterById(id);
  }

  async updateCluster(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdateCluster(body);

    const existing = await this.repository.findClusterById(id);

    // If tribeId is changing, validate new tribe exists
    if (validated.tribeId !== undefined) {
      const tribeExists = await this.repository.tribeExists(validated.tribeId);
      this.domain.validateParentExists(validated.tribeId, 'Tribe', tribeExists);
    }

    const updated = await this.repository.updateCluster(id, validated);

    await this.createAuditRecord(userId, 'Cluster', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deleteCluster(id: string, userId: string) {
    const existing = await this.repository.findClusterById(id);

    const result = await this.repository.deleteCluster(id);

    await this.createAuditRecord(userId, 'Cluster', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Squad Methods ────────────────────────────────────────────────────────

  async createSquad(body: unknown, userId: string) {
    const validated = this.domain.validateCreateSquad(body);

    // Validate hierarchy: Squad must have valid clusterId
    const clusterExists = await this.repository.clusterExists(validated.clusterId);
    this.domain.validateParentExists(validated.clusterId, 'Cluster', clusterExists);

    const squad = await this.repository.createSquad(validated);

    await this.createAuditRecord(userId, 'Squad', squad.id, 'CREATE', {
      after: squad,
    });

    return squad;
  }

  async findAllSquads(clusterId?: string) {
    return this.repository.findAllSquads(clusterId);
  }

  async findSquadById(id: string) {
    return this.repository.findSquadById(id);
  }

  async updateSquad(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdateSquad(body);

    const existing = await this.repository.findSquadById(id);

    // If clusterId is changing, validate new cluster exists
    if (validated.clusterId !== undefined) {
      const clusterExists = await this.repository.clusterExists(validated.clusterId);
      this.domain.validateParentExists(validated.clusterId, 'Cluster', clusterExists);
    }

    const updated = await this.repository.updateSquad(id, validated);

    await this.createAuditRecord(userId, 'Squad', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deleteSquad(id: string, userId: string) {
    const existing = await this.repository.findSquadById(id);

    const result = await this.repository.deleteSquad(id);

    await this.createAuditRecord(userId, 'Squad', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Team Membership Methods ──────────────────────────────────────────────

  async createTeamMembership(body: unknown, userId: string) {
    const validated = this.domain.validateCreateTeamMembership(body);

    // Validate employee exists
    const employeeExists = await this.repository.employeeExists(validated.employeeId);
    if (!employeeExists) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'employeeId',
            message: `Employee with id "${validated.employeeId}" does not exist`,
          },
        ],
      });
    }

    // Validate squad exists
    const squadExists = await this.repository.squadExists(validated.squadId);
    if (!squadExists) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'squadId',
            message: `Squad with id "${validated.squadId}" does not exist`,
          },
        ],
      });
    }

    // Validate capacity allocation won't exceed 100%
    const currentCapacity = await this.repository.getEmployeeTotalCapacity(
      validated.employeeId,
    );
    this.domain.validateCapacityAllocation(currentCapacity);

    const membership = await this.repository.createTeamMembership(validated);

    await this.createAuditRecord(userId, 'TeamMembership', membership.id, 'CREATE', {
      after: membership,
    });

    return membership;
  }

  async findAllTeamMemberships(employeeId?: string, squadId?: string) {
    return this.repository.findAllTeamMemberships(employeeId, squadId);
  }

  async deleteTeamMembership(id: string, userId: string) {
    const existing = await this.repository.findTeamMembershipById(id);

    const result = await this.repository.deleteTeamMembership(id);

    await this.createAuditRecord(userId, 'TeamMembership', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  private async createAuditRecord(
    userId: string,
    entityType: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    diff: Record<string, unknown>,
  ) {
    await this.prisma.auditRecord.create({
      data: {
        userId,
        entityType,
        entityId,
        operation,
        diff: JSON.parse(JSON.stringify(diff)),
      },
    });
  }
}
