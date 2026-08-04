import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  OrganizationsDomain,
  MAX_HIERARCHY_DEPTH,
  DepartmentNode,
} from '../organizations.domain';

describe('OrganizationsDomain', () => {
  let domain: OrganizationsDomain;

  beforeEach(() => {
    domain = new OrganizationsDomain();
  });

  describe('validateCreateDepartment', () => {
    const validPayload = {
      name: 'Engineering',
      organizationId: 'org-123',
    };

    it('should validate a minimal valid payload', () => {
      const result = domain.validateCreateDepartment(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should validate a full valid payload', () => {
      const full = {
        ...validPayload,
        description: 'Engineering department',
        parentId: 'dept-parent-1',
      };
      const result = domain.validateCreateDepartment(full);
      expect(result).toEqual(full);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateDepartment({})).toThrow(
        BadRequestException,
      );
    });

    it('should reject empty name', () => {
      expect(() =>
        domain.validateCreateDepartment({ ...validPayload, name: '' }),
      ).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateDepartment({ ...validPayload, unknownField: 'x' }),
      ).toThrow(BadRequestException);
    });

    it('should accept null description', () => {
      const payload = { ...validPayload, description: null };
      const result = domain.validateCreateDepartment(payload);
      expect(result.description).toBeNull();
    });

    it('should accept null parentId', () => {
      const payload = { ...validPayload, parentId: null };
      const result = domain.validateCreateDepartment(payload);
      expect(result.parentId).toBeNull();
    });
  });

  describe('validateUpdateDepartment', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdateDepartment({ name: 'New Name' });
      expect(result).toEqual({ name: 'New Name' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateDepartment({})).toThrow(
        BadRequestException,
      );
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateUpdateDepartment({ unknownField: 'x' }),
      ).toThrow(BadRequestException);
    });

    it('should accept parentId set to null (promote to root)', () => {
      const result = domain.validateUpdateDepartment({ parentId: null });
      expect(result.parentId).toBeNull();
    });
  });

  describe('validateCreatePosition', () => {
    const validPayload = {
      title: 'Software Engineer',
      level: 3,
      departmentId: 'dept-123',
    };

    it('should validate a minimal valid payload', () => {
      const result = domain.validateCreatePosition(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should validate a full valid payload', () => {
      const full = {
        ...validPayload,
        description: 'Builds software',
      };
      const result = domain.validateCreatePosition(full);
      expect(result).toEqual(full);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreatePosition({})).toThrow(
        BadRequestException,
      );
    });

    it('should reject level less than 1', () => {
      expect(() =>
        domain.validateCreatePosition({ ...validPayload, level: 0 }),
      ).toThrow(BadRequestException);
    });

    it('should reject non-integer level', () => {
      expect(() =>
        domain.validateCreatePosition({ ...validPayload, level: 2.5 }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateUpdatePosition', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdatePosition({ title: 'Senior Engineer' });
      expect(result).toEqual({ title: 'Senior Engineer' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdatePosition({})).toThrow(
        BadRequestException,
      );
    });
  });

  describe('detectCircularReference', () => {
    it('should not throw when setting parentId to null', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
      ];
      expect(() =>
        domain.detectCircularReference('B', null, departments),
      ).not.toThrow();
    });

    it('should throw when setting a department as its own parent', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
      ];
      expect(() =>
        domain.detectCircularReference('A', 'A', departments),
      ).toThrow(UnprocessableEntityException);
    });

    it('should throw when creating a direct cycle (A→B, B→A)', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
      ];
      // Moving A under B would create A→B→A cycle
      expect(() =>
        domain.detectCircularReference('A', 'B', departments),
      ).toThrow(UnprocessableEntityException);
    });

    it('should throw when creating an indirect cycle (A→B→C, C→A)', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'B' },
      ];
      // Moving A under C would create A→B→C→A cycle
      expect(() =>
        domain.detectCircularReference('A', 'C', departments),
      ).toThrow(UnprocessableEntityException);
    });

    it('should allow valid re-parenting (no cycle)', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: null },
        { id: 'D', parentId: 'C' },
      ];
      // Moving B under C is fine (no cycle)
      expect(() =>
        domain.detectCircularReference('B', 'C', departments),
      ).not.toThrow();
    });

    it('should allow moving a leaf node to a different branch', () => {
      const departments: DepartmentNode[] = [
        { id: 'root', parentId: null },
        { id: 'A', parentId: 'root' },
        { id: 'B', parentId: 'root' },
        { id: 'C', parentId: 'A' },
      ];
      // Moving C under B is fine
      expect(() =>
        domain.detectCircularReference('C', 'B', departments),
      ).not.toThrow();
    });

    it('should detect cycle in deep hierarchy', () => {
      // Chain: root → A → B → C → D → E
      const departments: DepartmentNode[] = [
        { id: 'root', parentId: null },
        { id: 'A', parentId: 'root' },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'B' },
        { id: 'D', parentId: 'C' },
        { id: 'E', parentId: 'D' },
      ];
      // Moving root under E would create a cycle
      expect(() =>
        domain.detectCircularReference('root', 'E', departments),
      ).toThrow(UnprocessableEntityException);
    });
  });

  describe('validateDepth', () => {
    it('should accept depth within limits', () => {
      // A chain of 5 departments
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'B' },
        { id: 'D', parentId: 'C' },
        { id: 'E', parentId: 'D' },
      ];
      // Creating a new department under E (depth = 6)
      expect(() =>
        domain.validateDepth('E', departments),
      ).not.toThrow();
    });

    it('should accept exactly MAX_HIERARCHY_DEPTH levels', () => {
      // Build a chain of MAX_HIERARCHY_DEPTH - 1 departments
      const departments: DepartmentNode[] = [];
      let prevId: string | null = null;
      for (let i = 0; i < MAX_HIERARCHY_DEPTH - 1; i++) {
        const id = `dept-${i}`;
        departments.push({ id, parentId: prevId });
        prevId = id;
      }
      // Creating at the bottom would make exactly MAX_HIERARCHY_DEPTH
      expect(() =>
        domain.validateDepth(prevId, departments),
      ).not.toThrow();
    });

    it('should reject depth exceeding MAX_HIERARCHY_DEPTH', () => {
      // Build a chain of MAX_HIERARCHY_DEPTH departments
      const departments: DepartmentNode[] = [];
      let prevId: string | null = null;
      for (let i = 0; i < MAX_HIERARCHY_DEPTH; i++) {
        const id = `dept-${i}`;
        departments.push({ id, parentId: prevId });
        prevId = id;
      }
      // Creating under the last one would exceed the limit
      expect(() =>
        domain.validateDepth(prevId, departments),
      ).toThrow(BadRequestException);
    });

    it('should account for subtree depth when re-parenting', () => {
      // Chain: A → B → C → D (D is 4 levels from root)
      // Subtree under X: X → Y → Z (2 levels below X)
      const departments: DepartmentNode[] = [];
      let prevId: string | null = null;
      for (let i = 0; i < MAX_HIERARCHY_DEPTH - 3; i++) {
        const id = `chain-${i}`;
        departments.push({ id, parentId: prevId });
        prevId = id;
      }
      // Add a subtree with 3 levels
      departments.push({ id: 'X', parentId: null });
      departments.push({ id: 'Y', parentId: 'X' });
      departments.push({ id: 'Z', parentId: 'Y' });

      // Moving X under the chain end: chain depth + 1(X) + 2(subtree below X) = MAX-3+1+2 = MAX
      expect(() =>
        domain.validateDepth(prevId, departments, 'X'),
      ).not.toThrow();
    });

    it('should reject re-parenting if subtree depth would exceed limit', () => {
      // Chain: A → B → C → ... (MAX_HIERARCHY_DEPTH - 2 levels)
      const departments: DepartmentNode[] = [];
      let prevId: string | null = null;
      for (let i = 0; i < MAX_HIERARCHY_DEPTH - 2; i++) {
        const id = `chain-${i}`;
        departments.push({ id, parentId: prevId });
        prevId = id;
      }
      // Add a subtree with 2 levels
      departments.push({ id: 'X', parentId: null });
      departments.push({ id: 'Y', parentId: 'X' });
      departments.push({ id: 'Z', parentId: 'Y' });

      // Moving X under the chain end: (MAX-2) + 1(X) + 2(subtree) = MAX+1 → exceed
      expect(() =>
        domain.validateDepth(prevId, departments, 'X'),
      ).toThrow(BadRequestException);
    });

    it('should support 10+ levels of nesting', () => {
      // Build a chain of exactly 10 departments
      const departments: DepartmentNode[] = [];
      let prevId: string | null = null;
      for (let i = 0; i < 10; i++) {
        const id = `dept-${i}`;
        departments.push({ id, parentId: prevId });
        prevId = id;
      }
      // Creating an 11th level should succeed (MAX_HIERARCHY_DEPTH is 20)
      expect(() =>
        domain.validateDepth(prevId, departments),
      ).not.toThrow();
    });

    it('should accept null parentId (root department creation)', () => {
      const departments: DepartmentNode[] = [];
      expect(() =>
        domain.validateDepth(null, departments),
      ).not.toThrow();
    });
  });

  describe('validateDeletionConstraint', () => {
    it('should not throw when there are no active employees', () => {
      expect(() => domain.validateDeletionConstraint([])).not.toThrow();
    });

    it('should throw when there are active employees', () => {
      const activeEmployees = [
        { id: 'emp-1', uin: 'EMP-000001' },
        { id: 'emp-2', uin: 'EMP-000002' },
      ];
      expect(() =>
        domain.validateDeletionConstraint(activeEmployees),
      ).toThrow(BadRequestException);
    });

    it('should include affected employee info in error details', () => {
      const activeEmployees = [{ id: 'emp-1', uin: 'EMP-000001' }];
      try {
        domain.validateDeletionConstraint(activeEmployees);
        fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.message).toBe(
          'Cannot delete department with active employees',
        );
        expect(response.details[0].employees).toEqual([
          { id: 'emp-1', uin: 'EMP-000001' },
        ]);
      }
    });
  });

  describe('getDepthFromRoot', () => {
    it('should return 0 for null (root level)', () => {
      expect(domain.getDepthFromRoot(null, [])).toBe(0);
    });

    it('should return 1 for a root department', () => {
      const departments: DepartmentNode[] = [{ id: 'A', parentId: null }];
      expect(domain.getDepthFromRoot('A', departments)).toBe(1);
    });

    it('should calculate correct depth for nested departments', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'B' },
      ];
      expect(domain.getDepthFromRoot('C', departments)).toBe(3);
    });
  });

  describe('getMaxSubtreeDepth', () => {
    it('should return 0 for a leaf node', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
      ];
      expect(domain.getMaxSubtreeDepth('A', departments)).toBe(0);
    });

    it('should return correct depth for a node with children', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'B' },
      ];
      expect(domain.getMaxSubtreeDepth('A', departments)).toBe(2);
    });

    it('should return max depth for branching subtrees', () => {
      const departments: DepartmentNode[] = [
        { id: 'A', parentId: null },
        { id: 'B', parentId: 'A' },
        { id: 'C', parentId: 'A' },
        { id: 'D', parentId: 'B' },
        { id: 'E', parentId: 'D' },
      ];
      // A has children B and C
      // B → D → E is deeper (depth 3)
      // C is just depth 1
      expect(domain.getMaxSubtreeDepth('A', departments)).toBe(3);
    });
  });
});
