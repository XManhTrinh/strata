import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CapacityDomain } from '../capacity.domain';

describe('CapacityDomain', () => {
  let domain: CapacityDomain;

  beforeEach(() => {
    domain = new CapacityDomain();
  });

  // ─── Create Allocation Validation ─────────────────────────────────────────

  describe('validateCreateAllocation', () => {
    const validPayload = {
      employeeId: 'emp-123',
      squadId: 'squad-456',
      percentage: 50,
    };

    it('should validate a valid payload', () => {
      const result = domain.validateCreateAllocation(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateAllocation({})).toThrow(BadRequestException);
    });

    it('should reject missing employeeId', () => {
      expect(() =>
        domain.validateCreateAllocation({ squadId: 'squad-1', percentage: 50 }),
      ).toThrow(BadRequestException);
    });

    it('should reject missing squadId', () => {
      expect(() =>
        domain.validateCreateAllocation({ employeeId: 'emp-1', percentage: 50 }),
      ).toThrow(BadRequestException);
    });

    it('should reject missing percentage', () => {
      expect(() =>
        domain.validateCreateAllocation({ employeeId: 'emp-1', squadId: 'squad-1' }),
      ).toThrow(BadRequestException);
    });

    it('should reject percentage below 1', () => {
      expect(() =>
        domain.validateCreateAllocation({ ...validPayload, percentage: 0 }),
      ).toThrow(BadRequestException);
    });

    it('should reject percentage above 100', () => {
      expect(() =>
        domain.validateCreateAllocation({ ...validPayload, percentage: 101 }),
      ).toThrow(BadRequestException);
    });

    it('should reject non-integer percentage', () => {
      expect(() =>
        domain.validateCreateAllocation({ ...validPayload, percentage: 50.5 }),
      ).toThrow(BadRequestException);
    });

    it('should reject negative percentage', () => {
      expect(() =>
        domain.validateCreateAllocation({ ...validPayload, percentage: -10 }),
      ).toThrow(BadRequestException);
    });

    it('should accept percentage of exactly 1', () => {
      const result = domain.validateCreateAllocation({ ...validPayload, percentage: 1 });
      expect(result.percentage).toBe(1);
    });

    it('should accept percentage of exactly 100', () => {
      const result = domain.validateCreateAllocation({ ...validPayload, percentage: 100 });
      expect(result.percentage).toBe(100);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateAllocation({ ...validPayload, extra: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Update Allocation Validation ─────────────────────────────────────────

  describe('validateUpdateAllocation', () => {
    it('should validate a partial update with percentage', () => {
      const result = domain.validateUpdateAllocation({ percentage: 75 });
      expect(result).toEqual({ percentage: 75 });
    });

    it('should validate a partial update with employeeId', () => {
      const result = domain.validateUpdateAllocation({ employeeId: 'emp-new' });
      expect(result).toEqual({ employeeId: 'emp-new' });
    });

    it('should validate a partial update with squadId', () => {
      const result = domain.validateUpdateAllocation({ squadId: 'squad-new' });
      expect(result).toEqual({ squadId: 'squad-new' });
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateAllocation({})).toThrow(BadRequestException);
    });

    it('should reject percentage below 1', () => {
      expect(() => domain.validateUpdateAllocation({ percentage: 0 })).toThrow(
        BadRequestException,
      );
    });

    it('should reject percentage above 100', () => {
      expect(() => domain.validateUpdateAllocation({ percentage: 101 })).toThrow(
        BadRequestException,
      );
    });

    it('should reject non-integer percentage', () => {
      expect(() => domain.validateUpdateAllocation({ percentage: 33.3 })).toThrow(
        BadRequestException,
      );
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateUpdateAllocation({ percentage: 50, unknown: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Percentage Bounds Validation ─────────────────────────────────────────

  describe('validatePercentageBounds', () => {
    it('should accept 1 (minimum)', () => {
      expect(() => domain.validatePercentageBounds(1)).not.toThrow();
    });

    it('should accept 100 (maximum)', () => {
      expect(() => domain.validatePercentageBounds(100)).not.toThrow();
    });

    it('should accept 50 (mid-range)', () => {
      expect(() => domain.validatePercentageBounds(50)).not.toThrow();
    });

    it('should reject 0', () => {
      expect(() => domain.validatePercentageBounds(0)).toThrow(BadRequestException);
    });

    it('should reject 101', () => {
      expect(() => domain.validatePercentageBounds(101)).toThrow(BadRequestException);
    });

    it('should reject negative values', () => {
      expect(() => domain.validatePercentageBounds(-5)).toThrow(BadRequestException);
    });

    it('should reject non-integer values', () => {
      expect(() => domain.validatePercentageBounds(50.5)).toThrow(BadRequestException);
    });

    it('should reject large values', () => {
      expect(() => domain.validatePercentageBounds(200)).toThrow(BadRequestException);
    });
  });

  // ─── Total Capacity Constraint ────────────────────────────────────────────

  describe('validateTotalCapacity', () => {
    it('should not throw when total is below 100%', () => {
      expect(() => domain.validateTotalCapacity(30, 40)).not.toThrow();
    });

    it('should not throw when total is exactly 100%', () => {
      expect(() => domain.validateTotalCapacity(60, 40)).not.toThrow();
    });

    it('should throw when total would exceed 100%', () => {
      expect(() => domain.validateTotalCapacity(80, 30)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw when current total is 100% and adding any', () => {
      expect(() => domain.validateTotalCapacity(100, 1)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('should not throw when current total is 0% and adding 100%', () => {
      expect(() => domain.validateTotalCapacity(0, 100)).not.toThrow();
    });

    it('should include percentages in error message', () => {
      try {
        domain.validateTotalCapacity(70, 40);
        fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.message).toBe('Total capacity allocation exceeded');
        expect(response.details[0].message).toContain('40%');
        expect(response.details[0].message).toContain('110%');
        expect(response.details[0].message).toContain('70%');
        expect(response.details[0].message).toContain('30%');
      }
    });

    it('should not throw when adding brings total to exactly 100%', () => {
      expect(() => domain.validateTotalCapacity(99, 1)).not.toThrow();
    });

    it('should throw when adding 1% to 100% current total', () => {
      expect(() => domain.validateTotalCapacity(100, 1)).toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
