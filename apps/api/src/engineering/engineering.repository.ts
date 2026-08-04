import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import type { CreateTribeDto } from './dto/create-tribe.dto';
import type { UpdateTribeDto } from './dto/update-tribe.dto';
import type { CreateClusterDto } from './dto/create-cluster.dto';
import type { UpdateClusterDto } from './dto/update-cluster.dto';
import type { CreateSquadDto } from './dto/create-squad.dto';
import type { UpdateSquadDto } from './dto/update-squad.dto';
import type { CreateTeamMembershipDto } from './dto/create-team-membership.dto';
import type { UpdateTeamMembershipDto } from './dto/update-team-membership.dto';

@Injectable()
export class EngineeringRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Tribe Methods ────────────────────────────────────────────────────────

  async createTribe(data: CreateTribeDto) {
    return this.prisma.tribe.create({
      data: {
        name: data.name,
        organizationId: data.organizationId,
      },
    });
  }

  async findTribeById(id: string) {
    const tribe = await this.prisma.tribe.findUnique({
      where: { id },
      include: {
        clusters: {
          include: {
            squads: true,
          },
        },
      },
    });
    if (!tribe) {
      throw new NotFoundException(`Tribe with id "${id}" not found`);
    }
    return tribe;
  }

  async findAllTribes(organizationId?: string) {
    const where: Record<string, unknown> = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.prisma.tribe.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateTribe(id: string, data: UpdateTribeDto) {
    await this.findTribeById(id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;

    return this.prisma.tribe.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTribe(id: string) {
    await this.findTribeById(id);
    await this.prisma.tribe.delete({ where: { id } });
    return { deleted: true, id };
  }

  async tribeExists(id: string): Promise<boolean> {
    const tribe = await this.prisma.tribe.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!tribe;
  }

  // ─── Cluster Methods ──────────────────────────────────────────────────────

  async createCluster(data: CreateClusterDto) {
    return this.prisma.cluster.create({
      data: {
        name: data.name,
        tribeId: data.tribeId,
      },
    });
  }

  async findClusterById(id: string) {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id },
      include: { squads: true },
    });
    if (!cluster) {
      throw new NotFoundException(`Cluster with id "${id}" not found`);
    }
    return cluster;
  }

  async findAllClusters(tribeId?: string) {
    const where: Record<string, unknown> = {};
    if (tribeId) {
      where.tribeId = tribeId;
    }
    return this.prisma.cluster.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateCluster(id: string, data: UpdateClusterDto) {
    await this.findClusterById(id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tribeId !== undefined) updateData.tribeId = data.tribeId;

    return this.prisma.cluster.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteCluster(id: string) {
    await this.findClusterById(id);
    await this.prisma.cluster.delete({ where: { id } });
    return { deleted: true, id };
  }

  async clusterExists(id: string): Promise<boolean> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!cluster;
  }

  // ─── Squad Methods ────────────────────────────────────────────────────────

  async createSquad(data: CreateSquadDto) {
    return this.prisma.squad.create({
      data: {
        name: data.name,
        clusterId: data.clusterId,
      },
    });
  }

  async findSquadById(id: string) {
    const squad = await this.prisma.squad.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!squad) {
      throw new NotFoundException(`Squad with id "${id}" not found`);
    }
    return squad;
  }

  async findAllSquads(clusterId?: string) {
    const where: Record<string, unknown> = {};
    if (clusterId) {
      where.clusterId = clusterId;
    }
    return this.prisma.squad.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateSquad(id: string, data: UpdateSquadDto) {
    await this.findSquadById(id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.clusterId !== undefined) updateData.clusterId = data.clusterId;

    return this.prisma.squad.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteSquad(id: string) {
    await this.findSquadById(id);
    await this.prisma.squad.delete({ where: { id } });
    return { deleted: true, id };
  }

  async squadExists(id: string): Promise<boolean> {
    const squad = await this.prisma.squad.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!squad;
  }

  // ─── Team Membership Methods ──────────────────────────────────────────────

  async createTeamMembership(data: CreateTeamMembershipDto) {
    return this.prisma.teamMembership.create({
      data: {
        employeeId: data.employeeId,
        squadId: data.squadId,
        role: data.role ?? null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  async findTeamMembershipById(id: string) {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { id },
    });
    if (!membership) {
      throw new NotFoundException(`TeamMembership with id "${id}" not found`);
    }
    return membership;
  }

  async findAllTeamMemberships(employeeId?: string, squadId?: string) {
    const where: Record<string, unknown> = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (squadId) {
      where.squadId = squadId;
    }
    return this.prisma.teamMembership.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTeamMembership(id: string) {
    await this.findTeamMembershipById(id);
    await this.prisma.teamMembership.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Capacity Queries ─────────────────────────────────────────────────────

  /**
   * Gets the total capacity allocation percentage for an employee across all squads.
   */
  async getEmployeeTotalCapacity(employeeId: string): Promise<number> {
    const allocations = await this.prisma.capacityAllocation.findMany({
      where: { employeeId },
      select: { percentage: true },
    });
    return allocations.reduce((sum, a) => sum + a.percentage, 0);
  }

  /**
   * Check if employee exists.
   */
  async employeeExists(id: string): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!employee;
  }
}
