import { BadRequestException } from '@nestjs/common';
import { EmployeesDomain } from '../employees.domain';

describe('EmployeesDomain', () => {
  let domain: EmployeesDomain;

  beforeEach(() => {
    domain = new EmployeesDomain();
  });

  describe('validateCreate', () => {
    const validPayload = {
      personId: 'person-123',
      organizationId: 'org-456',
      startDate: '2024-01-01T00:00:00.000Z',
    };

    it('should validate a minimal valid payload', () => {
      const result = domain.validateCreate(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should validate a full valid payload', () => {
      const full = {
        ...validPayload,
        departmentId: 'dept-1',
        positionId: 'pos-1',
        endDate: '2025-01-01T00:00:00.000Z',
        status: 'ACTIVE',
      };
      const result = domain.validateCreate(full);
      expect(result).toEqual(full);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreate({})).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreate({ ...validPayload, unknownField: 'x' }),
      ).toThrow(BadRequestException);
    });

    it('should reject invalid status values', () => {
      expect(() =>
        domain.validateCreate({ ...validPayload, status: 'INVALID' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateUpdate', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdate({ departmentId: 'dept-1' });
      expect(result).toEqual({ departmentId: 'dept-1' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdate({})).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() => domain.validateUpdate({ uin: 'EMP-000001' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertUinNotInPayload', () => {
    it('should not throw if uin is not in payload', () => {
      expect(() => domain.assertUinNotInPayload({ departmentId: 'dept-1' })).not.toThrow();
    });

    it('should throw if uin is in payload', () => {
      expect(() => domain.assertUinNotInPayload({ uin: 'EMP-000001' })).toThrow(
        BadRequestException,
      );
    });

    it('should not throw for null or undefined data', () => {
      expect(() => domain.assertUinNotInPayload(null)).not.toThrow();
      expect(() => domain.assertUinNotInPayload(undefined)).not.toThrow();
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow ACTIVE → ON_LEAVE', () => {
      expect(() =>
        domain.validateStatusTransition('ACTIVE', 'ON_LEAVE'),
      ).not.toThrow();
    });

    it('should allow ACTIVE → SUSPENDED', () => {
      expect(() =>
        domain.validateStatusTransition('ACTIVE', 'SUSPENDED'),
      ).not.toThrow();
    });

    it('should allow ACTIVE → TERMINATED', () => {
      expect(() =>
        domain.validateStatusTransition('ACTIVE', 'TERMINATED'),
      ).not.toThrow();
    });

    it('should allow ON_LEAVE → ACTIVE', () => {
      expect(() =>
        domain.validateStatusTransition('ON_LEAVE', 'ACTIVE'),
      ).not.toThrow();
    });

    it('should allow ON_LEAVE → TERMINATED', () => {
      expect(() =>
        domain.validateStatusTransition('ON_LEAVE', 'TERMINATED'),
      ).not.toThrow();
    });

    it('should allow SUSPENDED → ACTIVE', () => {
      expect(() =>
        domain.validateStatusTransition('SUSPENDED', 'ACTIVE'),
      ).not.toThrow();
    });

    it('should allow SUSPENDED → TERMINATED', () => {
      expect(() =>
        domain.validateStatusTransition('SUSPENDED', 'TERMINATED'),
      ).not.toThrow();
    });

    it('should reject TERMINATED → ACTIVE (terminal state)', () => {
      expect(() =>
        domain.validateStatusTransition('TERMINATED', 'ACTIVE'),
      ).toThrow(BadRequestException);
    });

    it('should reject TERMINATED → ON_LEAVE (terminal state)', () => {
      expect(() =>
        domain.validateStatusTransition('TERMINATED', 'ON_LEAVE'),
      ).toThrow(BadRequestException);
    });

    it('should reject ON_LEAVE → SUSPENDED (not a valid transition)', () => {
      expect(() =>
        domain.validateStatusTransition('ON_LEAVE', 'SUSPENDED'),
      ).toThrow(BadRequestException);
    });

    it('should reject SUSPENDED → ON_LEAVE (not a valid transition)', () => {
      expect(() =>
        domain.validateStatusTransition('SUSPENDED', 'ON_LEAVE'),
      ).toThrow(BadRequestException);
    });

    it('should reject same-state transitions', () => {
      expect(() =>
        domain.validateStatusTransition('ACTIVE', 'ACTIVE'),
      ).toThrow(BadRequestException);
    });
  });

  describe('generateUin', () => {
    it('should generate UIN with proper format', () => {
      expect(domain.generateUin(0)).toBe('EMP-000001');
    });

    it('should generate sequential UINs', () => {
      expect(domain.generateUin(5)).toBe('EMP-000006');
      expect(domain.generateUin(99)).toBe('EMP-000100');
      expect(domain.generateUin(999999)).toBe('EMP-1000000');
    });

    it('should pad numbers to 6 digits', () => {
      expect(domain.generateUin(0)).toBe('EMP-000001');
      expect(domain.generateUin(9)).toBe('EMP-000010');
      expect(domain.generateUin(99)).toBe('EMP-000100');
    });
  });
});
