import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateDepartmentDtoSchema } from './dto/create-department.dto';
import { UpdateDepartmentDtoSchema } from './dto/update-department.dto';
import { CreatePositionDtoSchema } from './dto/create-position.dto';
import { UpdatePositionDtoSchema } from './dto/update-position.dto';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';
import type { CreatePositionDto } from './dto/create-position.dto';
import type { UpdatePositionDto } from './dto/update-position.dto';

export const MAX_HIERARCHY_DEPTH = 20;

export interface DepartmentNode {
  id: string;
  parentId: string | null;
}

export class OrganizationsDomain {
  /**
   * Validates a create-department payload.
   */
  validateCreateDepartment(data: unknown): CreateDepartmentDto {
    const result = CreateDepartmentDtoSchema.safeParse(data);
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

  /**
   * Validates an update-department payload.
   * Rejects if payload is empty.
   */
  validateUpdateDepartment(data: unknown): UpdateDepartmentDto {
    const result = UpdateDepartmentDtoSchema.safeParse(data);
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

  /**
   * Validates a create-position payload.
   */
  validateCreatePosition(data: unknown): CreatePositionDto {
    const result = CreatePositionDtoSchema.safeParse(data);
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

  /**
   * Validates an update-position payload.
   * Rejects if payload is empty.
   */
  validateUpdatePosition(data: unknown): UpdatePositionDto {
    const result = UpdatePositionDtoSchema.safeParse(data);
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

  /**
   * Detects circular references in the department hierarchy.
   * Given a department that is being re-parented to `newParentId`,
   * traverses the ancestor chain of `newParentId` to ensure the
   * current department is not an ancestor (which would create a cycle).
   *
   * @param departmentId - The department being moved
   * @param newParentId - The proposed new parent
   * @param departments - All departments (id + parentId) for the organization
   * @throws UnprocessableEntityException if a cycle is detected
   */
  detectCircularReference(
    departmentId: string,
    newParentId: string | null,
    departments: DepartmentNode[],
  ): void {
    if (!newParentId) {
      return; // Setting parentId to null is always safe (becomes root)
    }

    // Cannot set parent to self
    if (newParentId === departmentId) {
      throw new UnprocessableEntityException({
        message: 'Circular reference detected',
        details: [
          {
            field: 'parentId',
            message:
              'A department cannot be its own parent',
          },
        ],
      });
    }

    // Build a lookup map for fast ancestor traversal
    const parentMap = new Map<string, string | null>();
    for (const dept of departments) {
      parentMap.set(dept.id, dept.parentId);
    }

    // Walk the ancestor chain from newParentId upward
    const visited = new Set<string>();
    let currentId: string | null = newParentId;

    while (currentId !== null) {
      if (currentId === departmentId) {
        throw new UnprocessableEntityException({
          message: 'Circular reference detected',
          details: [
            {
              field: 'parentId',
              message:
                'Setting this parent would create a circular reference in the hierarchy',
            },
          ],
        });
      }

      if (visited.has(currentId)) {
        // Existing cycle in data (should not happen), break to prevent infinite loop
        break;
      }

      visited.add(currentId);
      currentId = parentMap.get(currentId) ?? null;
    }
  }

  /**
   * Validates hierarchy depth when creating or re-parenting a department.
   * The resulting depth (from root to the deepest descendant under this department)
   * must not exceed MAX_HIERARCHY_DEPTH.
   *
   * @param parentId - The parent of the department
   * @param departments - All departments in the organization
   * @param departmentId - The department being evaluated (for subtree depth calculation)
   * @throws BadRequestException if max depth would be exceeded
   */
  validateDepth(
    parentId: string | null,
    departments: DepartmentNode[],
    departmentId?: string,
  ): void {
    // Calculate depth of the parent from root
    const parentDepth = this.getDepthFromRoot(parentId, departments);

    // Calculate the subtree depth below the department being moved/created
    let subtreeDepth = 0;
    if (departmentId) {
      subtreeDepth = this.getMaxSubtreeDepth(departmentId, departments);
    }

    // Total depth = parent's depth + 1 (this node) + subtreeDepth
    const totalDepth = parentDepth + 1 + subtreeDepth;

    if (totalDepth > MAX_HIERARCHY_DEPTH) {
      throw new BadRequestException({
        message: 'Maximum hierarchy depth exceeded',
        details: [
          {
            field: 'parentId',
            message: `Department hierarchy cannot exceed ${MAX_HIERARCHY_DEPTH} levels. Resulting depth would be ${totalDepth}.`,
          },
        ],
      });
    }
  }

  /**
   * Calculates the depth from root to a given department.
   * Root departments have depth 0, their children have depth 1, etc.
   */
  getDepthFromRoot(
    departmentId: string | null,
    departments: DepartmentNode[],
  ): number {
    if (!departmentId) {
      return 0;
    }

    const parentMap = new Map<string, string | null>();
    for (const dept of departments) {
      parentMap.set(dept.id, dept.parentId);
    }

    let depth = 0;
    let currentId: string | null = departmentId;
    const visited = new Set<string>();

    while (currentId !== null) {
      if (visited.has(currentId)) {
        break; // Existing cycle, avoid infinite loop
      }
      visited.add(currentId);
      depth++;
      currentId = parentMap.get(currentId) ?? null;
    }

    return depth;
  }

  /**
   * Calculates the maximum subtree depth below a given department.
   * If the department has no children, returns 0.
   */
  getMaxSubtreeDepth(
    departmentId: string,
    departments: DepartmentNode[],
  ): number {
    // Build children map
    const childrenMap = new Map<string, string[]>();
    for (const dept of departments) {
      if (dept.parentId) {
        const children = childrenMap.get(dept.parentId) || [];
        children.push(dept.id);
        childrenMap.set(dept.parentId, children);
      }
    }

    // BFS to find max depth below this node
    let maxDepth = 0;
    const queue: Array<{ id: string; depth: number }> = [];

    const directChildren = childrenMap.get(departmentId) || [];
    for (const childId of directChildren) {
      queue.push({ id: childId, depth: 1 });
    }

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth > maxDepth) {
        maxDepth = depth;
      }

      const children = childrenMap.get(id) || [];
      for (const childId of children) {
        queue.push({ id: childId, depth: depth + 1 });
      }
    }

    return maxDepth;
  }

  /**
   * Validates that a department can be deleted (no active employees).
   * @returns list of active employee IDs if deletion is blocked
   */
  validateDeletionConstraint(
    activeEmployees: Array<{ id: string; uin: string }>,
  ): void {
    if (activeEmployees.length > 0) {
      throw new BadRequestException({
        message: 'Cannot delete department with active employees',
        details: [
          {
            field: 'departmentId',
            message: `Department has ${activeEmployees.length} active employee(s)`,
            employees: activeEmployees.map((e) => ({
              id: e.id,
              uin: e.uin,
            })),
          },
        ],
      });
    }
  }
}
