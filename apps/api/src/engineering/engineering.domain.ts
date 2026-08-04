import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateTribeDtoSchema } from './dto/create-tribe.dto';
import { UpdateTribeDtoSchema } from './dto/update-tribe.dto';
import { CreateClusterDtoSchema } from './dto/create-cluster.dto';
import { UpdateClusterDtoSchema } from './dto/update-cluster.dto';
import { CreateSquadDtoSchema } from './dto/create-squad.dto';
import { UpdateSquadDtoSchema } from './dto/update-squad.dto';
import { CreateTeamMembershipDtoSchema } from './dto/create-team-membership.dto';
import { UpdateTeamMembershipDtoSchema } from './dto/update-team-membership.dto';
import type { CreateTribeDto } from './dto/create-tribe.dto';
import type { UpdateTribeDto } from './dto/update-tribe.dto';
import type { CreateClusterDto } from './dto/create-cluster.dto';
import type { UpdateClusterDto } from './dto/update-cluster.dto';
import type { CreateSquadDto } from './dto/create-squad.dto';
import type { UpdateSquadDto } from './dto/update-squad.dto';
import type { CreateTeamMembershipDto } from './dto/create-team-membership.dto';
import type { UpdateTeamMembershipDto } from './dto/update-team-membership.dto';

export class EngineeringDomain {
  // ─── Tribe Validation ─────────────────────────────────────────────────────

  validateCreateTribe(data: unknown): CreateTribeDto {
    const result = CreateTribeDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  validateUpdateTribe(data: unknown): UpdateTribeDto {
    const result = UpdateTribeDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'body',
            message: 'At least one field must be provided for update',
          },
        ],
      });
    }
    return result.data;
  }

  // ─── Cluster Validation ───────────────────────────────────────────────────

  validateCreateCluster(data: unknown): CreateClusterDto {
    const result = CreateClusterDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  validateUpdateCluster(data: unknown): UpdateClusterDto {
    const result = UpdateClusterDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'body',
            message: 'At least one field must be provided for update',
          },
        ],
      });
    }
    return result.data;
  }

  // ─── Squad Validation ─────────────────────────────────────────────────────

  validateCreateSquad(data: unknown): CreateSquadDto {
    const result = CreateSquadDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  validateUpdateSquad(data: unknown): UpdateSquadDto {
    const result = UpdateSquadDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'body',
            message: 'At least one field must be provided for update',
          },
        ],
      });
    }
    return result.data;
  }

  // ─── Team Membership Validation ───────────────────────────────────────────

  validateCreateTeamMembership(data: unknown): CreateTeamMembershipDto {
    const result = CreateTeamMembershipDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  validateUpdateTeamMembership(data: unknown): UpdateTeamMembershipDto {
    const result = UpdateTeamMembershipDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'body',
            message: 'At least one field must be provided for update',
          },
        ],
      });
    }
    return result.data;
  }

  // ─── Hierarchy Validation ─────────────────────────────────────────────────

  /**
   * Validates that a parent entity exists in the provided list.
   * Used to enforce Tribe → Cluster → Squad hierarchy.
   */
  validateParentExists(
    parentId: string,
    parentType: 'Tribe' | 'Cluster',
    parentExists: boolean,
  ): void {
    if (!parentExists) {
      const fieldName = parentType === 'Tribe' ? 'tribeId' : 'clusterId';
      throw new UnprocessableEntityException({
        message: `${parentType} not found`,
        details: [
          {
            field: fieldName,
            message: `${parentType} with id "${parentId}" does not exist`,
          },
        ],
      });
    }
  }

  // ─── Capacity Validation ──────────────────────────────────────────────────

  /**
   * Validates that adding a new team membership won't exceed 100% total capacity
   * allocation for the given employee.
   *
   * @param currentTotalPercentage - Sum of current capacity allocations for the employee
   * @param maxPercentage - Maximum allowed total (default 100)
   * @throws BadRequestException if adding membership would exceed capacity
   */
  validateCapacityAllocation(
    currentTotalPercentage: number,
    maxPercentage: number = 100,
  ): void {
    if (currentTotalPercentage > maxPercentage) {
      throw new BadRequestException({
        message: 'Capacity allocation exceeded',
        details: [
          {
            field: 'employeeId',
            message: `Employee's total capacity allocation (${currentTotalPercentage}%) would exceed ${maxPercentage}%`,
          },
        ],
      });
    }
  }
}
