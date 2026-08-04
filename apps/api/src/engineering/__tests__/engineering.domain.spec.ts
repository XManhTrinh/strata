import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EngineeringDomain } from '../engineering.domain';

describe('EngineeringDomain', () => {
  let domain: EngineeringDomain;

  beforeEach(() => {
    domain = new EngineeringDomain();
  });

  // ─── Tribe Validation ─────────────────────────────────────────────────────

  describe('validateCreateTribe', () => {
    const validPayload = {
      name: 'Platform Tribe',
      organizationId: 'org-123',
    };

    it('should validate a valid payload', () => {
      const result = domain.validateCreateTribe(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateTribe({})).toThrow(BadRequestException);
    });

    it('should reject empty name', () => {
      expect(() =>
        domain.validateCreateTribe({ ...validPayload, name: '' }),
      ).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateTribe({ ...validPayload, extra: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateUpdateTribe', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdateTribe({ name: 'New Name' });
      expect(result).toEqual({ name: 'New Name' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateTribe({})).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateUpdateTribe({ unknown: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Cluster Validation ───────────────────────────────────────────────────

  describe('validateCreateCluster', () => {
    const validPayload = {
      name: 'Backend Cluster',
      tribeId: 'tribe-123',
    };

    it('should validate a valid payload', () => {
      const result = domain.validateCreateCluster(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateCluster({})).toThrow(
        BadRequestException,
      );
    });

    it('should reject empty name', () => {
      expect(() =>
        domain.validateCreateCluster({ ...validPayload, name: '' }),
      ).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateCluster({ ...validPayload, extra: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateUpdateCluster', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdateCluster({ name: 'New Cluster' });
      expect(result).toEqual({ name: 'New Cluster' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateCluster({})).toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Squad Validation ─────────────────────────────────────────────────────

  describe('validateCreateSquad', () => {
    const validPayload = {
      name: 'Auth Squad',
      clusterId: 'cluster-123',
    };

    it('should validate a valid payload', () => {
      const result = domain.validateCreateSquad(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateSquad({})).toThrow(
        BadRequestException,
      );
    });

    it('should reject empty name', () => {
      expect(() =>
        domain.validateCreateSquad({ ...validPayload, name: '' }),
      ).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateSquad({ ...validPayload, extra: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateUpdateSquad', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdateSquad({ name: 'New Squad' });
      expect(result).toEqual({ name: 'New Squad' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateSquad({})).toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Team Membership Validation ───────────────────────────────────────────

  describe('validateCreateTeamMembership', () => {
    const validPayload = {
      employeeId: 'emp-123',
      squadId: 'squad-123',
    };

    it('should validate a minimal valid payload', () => {
      const result = domain.validateCreateTeamMembership(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should validate a full payload', () => {
      const full = {
        ...validPayload,
        role: 'Tech Lead',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: null,
      };
      const result = domain.validateCreateTeamMembership(full);
      expect(result).toEqual(full);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateTeamMembership({})).toThrow(
        BadRequestException,
      );
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateTeamMembership({ ...validPayload, extra: 'x' }),
      ).toThrow(BadRequestException);
    });

    it('should accept null role', () => {
      const payload = { ...validPayload, role: null };
      const result = domain.validateCreateTeamMembership(payload);
      expect(result.role).toBeNull();
    });
  });

  describe('validateUpdateTeamMembership', () => {
    it('should validate a partial update', () => {
      const result = domain.validateUpdateTeamMembership({ role: 'Developer' });
      expect(result).toEqual({ role: 'Developer' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateTeamMembership({})).toThrow(
        BadRequestException,
      );
    });

    it('should accept null role', () => {
      const result = domain.validateUpdateTeamMembership({ role: null });
      expect(result.role).toBeNull();
    });
  });

  // ─── Hierarchy Validation ─────────────────────────────────────────────────

  describe('validateParentExists', () => {
    it('should not throw when parent exists', () => {
      expect(() =>
        domain.validateParentExists('tribe-1', 'Tribe', true),
      ).not.toThrow();
    });

    it('should throw UnprocessableEntityException when Tribe parent does not exist', () => {
      expect(() =>
        domain.validateParentExists('tribe-invalid', 'Tribe', false),
      ).toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException when Cluster parent does not exist', () => {
      expect(() =>
        domain.validateParentExists('cluster-invalid', 'Cluster', false),
      ).toThrow(UnprocessableEntityException);
    });

    it('should include field name in error details for Tribe', () => {
      try {
        domain.validateParentExists('tribe-invalid', 'Tribe', false);
        fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.details[0].field).toBe('tribeId');
        expect(response.details[0].message).toContain('tribe-invalid');
      }
    });

    it('should include field name in error details for Cluster', () => {
      try {
        domain.validateParentExists('cluster-invalid', 'Cluster', false);
        fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.details[0].field).toBe('clusterId');
        expect(response.details[0].message).toContain('cluster-invalid');
      }
    });
  });

  // ─── Capacity Validation ──────────────────────────────────────────────────

  describe('validateCapacityAllocation', () => {
    it('should not throw when total is below 100%', () => {
      expect(() => domain.validateCapacityAllocation(50)).not.toThrow();
    });

    it('should not throw when total is exactly 100%', () => {
      expect(() => domain.validateCapacityAllocation(100)).not.toThrow();
    });

    it('should throw when total exceeds 100%', () => {
      expect(() => domain.validateCapacityAllocation(101)).toThrow(
        BadRequestException,
      );
    });

    it('should not throw when total is 0%', () => {
      expect(() => domain.validateCapacityAllocation(0)).not.toThrow();
    });

    it('should include percentage in error message', () => {
      try {
        domain.validateCapacityAllocation(150);
        fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.message).toBe('Capacity allocation exceeded');
        expect(response.details[0].message).toContain('150%');
      }
    });

    it('should support custom max percentage', () => {
      expect(() => domain.validateCapacityAllocation(80, 80)).not.toThrow();
      expect(() => domain.validateCapacityAllocation(81, 80)).toThrow(
        BadRequestException,
      );
    });
  });
});
