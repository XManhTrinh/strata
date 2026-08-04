import { BadRequestException } from '@nestjs/common';
import { LeaveDomain } from '../leave.domain';

describe('LeaveDomain', () => {
  let domain: LeaveDomain;

  beforeEach(() => {
    domain = new LeaveDomain();
  });

  // ─── Create Leave Validation ──────────────────────────────────────────────

  describe('validateCreateLeave', () => {
    const validPayload = {
      employeeId: 'emp-123',
      type: 'ANNUAL',
      startDate: '2024-06-01',
      endDate: '2024-06-10',
    };

    it('should validate a valid payload', () => {
      const result = domain.validateCreateLeave(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should accept optional reason', () => {
      const result = domain.validateCreateLeave({ ...validPayload, reason: 'Vacation trip' });
      expect(result.reason).toBe('Vacation trip');
    });

    it('should accept null reason', () => {
      const result = domain.validateCreateLeave({ ...validPayload, reason: null });
      expect(result.reason).toBeNull();
    });

    it('should accept all valid leave types', () => {
      const types = ['ANNUAL', 'SICK', 'PERSONAL', 'PARENTAL', 'UNPAID'];
      for (const type of types) {
        const result = domain.validateCreateLeave({ ...validPayload, type });
        expect(result.type).toBe(type);
      }
    });

    it('should reject missing employeeId', () => {
      const { employeeId, ...rest } = validPayload;
      expect(() => domain.validateCreateLeave(rest)).toThrow(BadRequestException);
    });

    it('should reject empty employeeId', () => {
      expect(() => domain.validateCreateLeave({ ...validPayload, employeeId: '' })).toThrow(
        BadRequestException,
      );
    });

    it('should reject missing type', () => {
      const { type, ...rest } = validPayload;
      expect(() => domain.validateCreateLeave(rest)).toThrow(BadRequestException);
    });

    it('should reject invalid type', () => {
      expect(() => domain.validateCreateLeave({ ...validPayload, type: 'INVALID' })).toThrow(
        BadRequestException,
      );
    });

    it('should reject missing startDate', () => {
      const { startDate, ...rest } = validPayload;
      expect(() => domain.validateCreateLeave(rest)).toThrow(BadRequestException);
    });

    it('should reject missing endDate', () => {
      const { endDate, ...rest } = validPayload;
      expect(() => domain.validateCreateLeave(rest)).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() => domain.validateCreateLeave({ ...validPayload, extra: 'x' })).toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Status Machine ───────────────────────────────────────────────────────

  describe('validateStatusTransition', () => {
    // Valid transitions
    it('should allow PENDING → APPROVED', () => {
      expect(() => domain.validateStatusTransition('PENDING', 'APPROVED')).not.toThrow();
    });

    it('should allow PENDING → REJECTED', () => {
      expect(() => domain.validateStatusTransition('PENDING', 'REJECTED')).not.toThrow();
    });

    it('should allow APPROVED → CANCELLED', () => {
      expect(() => domain.validateStatusTransition('APPROVED', 'CANCELLED')).not.toThrow();
    });

    // Invalid transitions
    it('should reject PENDING → CANCELLED', () => {
      expect(() => domain.validateStatusTransition('PENDING', 'CANCELLED')).toThrow(
        BadRequestException,
      );
    });

    it('should reject APPROVED → APPROVED', () => {
      expect(() => domain.validateStatusTransition('APPROVED', 'APPROVED')).toThrow(
        BadRequestException,
      );
    });

    it('should reject APPROVED → REJECTED', () => {
      expect(() => domain.validateStatusTransition('APPROVED', 'REJECTED')).toThrow(
        BadRequestException,
      );
    });

    it('should reject APPROVED → PENDING', () => {
      expect(() => domain.validateStatusTransition('APPROVED', 'PENDING')).toThrow(
        BadRequestException,
      );
    });

    it('should reject REJECTED → any', () => {
      expect(() => domain.validateStatusTransition('REJECTED', 'APPROVED')).toThrow(
        BadRequestException,
      );
      expect(() => domain.validateStatusTransition('REJECTED', 'PENDING')).toThrow(
        BadRequestException,
      );
      expect(() => domain.validateStatusTransition('REJECTED', 'CANCELLED')).toThrow(
        BadRequestException,
      );
    });

    it('should reject CANCELLED → any', () => {
      expect(() => domain.validateStatusTransition('CANCELLED', 'APPROVED')).toThrow(
        BadRequestException,
      );
      expect(() => domain.validateStatusTransition('CANCELLED', 'PENDING')).toThrow(
        BadRequestException,
      );
      expect(() => domain.validateStatusTransition('CANCELLED', 'REJECTED')).toThrow(
        BadRequestException,
      );
    });

    it('should include valid transitions in error message', () => {
      try {
        domain.validateStatusTransition('PENDING', 'CANCELLED');
        fail('Expected to throw');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.details[0].message).toContain('APPROVED');
        expect(response.details[0].message).toContain('REJECTED');
      }
    });

    it('should indicate terminal state in error for REJECTED', () => {
      try {
        domain.validateStatusTransition('REJECTED', 'APPROVED');
        fail('Expected to throw');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.details[0].message).toContain('terminal state');
      }
    });
  });

  // ─── Date Validation ──────────────────────────────────────────────────────

  describe('validateDates', () => {
    it('should accept valid date range', () => {
      const result = domain.validateDates('2024-06-01', '2024-06-10');
      expect(result.start).toEqual(new Date('2024-06-01'));
      expect(result.end).toEqual(new Date('2024-06-10'));
    });

    it('should accept same start and end date', () => {
      const result = domain.validateDates('2024-06-01', '2024-06-01');
      expect(result.start).toEqual(result.end);
    });

    it('should reject endDate before startDate', () => {
      expect(() => domain.validateDates('2024-06-10', '2024-06-01')).toThrow(BadRequestException);
    });

    it('should reject invalid startDate', () => {
      expect(() => domain.validateDates('invalid', '2024-06-10')).toThrow(BadRequestException);
    });

    it('should reject invalid endDate', () => {
      expect(() => domain.validateDates('2024-06-01', 'invalid')).toThrow(BadRequestException);
    });

    it('should include correct field in error for invalid startDate', () => {
      try {
        domain.validateDates('not-a-date', '2024-06-10');
        fail('Expected to throw');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.details[0].field).toBe('startDate');
      }
    });

    it('should include correct field in error for endDate < startDate', () => {
      try {
        domain.validateDates('2024-06-10', '2024-06-01');
        fail('Expected to throw');
      } catch (e: any) {
        const response = e.getResponse();
        expect(response.details[0].field).toBe('endDate');
      }
    });
  });

  // ─── Overlap Detection ────────────────────────────────────────────────────

  describe('detectOverlap', () => {
    const approvedRequests = [
      {
        id: 'req-1',
        employeeId: 'emp-1',
        startDate: new Date('2024-06-05'),
        endDate: new Date('2024-06-10'),
        status: 'APPROVED' as const,
      },
      {
        id: 'req-2',
        employeeId: 'emp-1',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-05'),
        status: 'APPROVED' as const,
      },
    ];

    it('should return null when no overlap exists', () => {
      const result = domain.detectOverlap(
        new Date('2024-06-11'),
        new Date('2024-06-15'),
        approvedRequests,
      );
      expect(result).toBeNull();
    });

    it('should return null for empty approved requests', () => {
      const result = domain.detectOverlap(
        new Date('2024-06-01'),
        new Date('2024-06-10'),
        [],
      );
      expect(result).toBeNull();
    });

    it('should detect full overlap', () => {
      const result = domain.detectOverlap(
        new Date('2024-06-06'),
        new Date('2024-06-08'),
        approvedRequests,
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-1');
    });

    it('should detect partial overlap at start', () => {
      const result = domain.detectOverlap(
        new Date('2024-06-03'),
        new Date('2024-06-06'),
        approvedRequests,
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-1');
    });

    it('should detect partial overlap at end', () => {
      const result = domain.detectOverlap(
        new Date('2024-06-09'),
        new Date('2024-06-12'),
        approvedRequests,
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-1');
    });

    it('should detect overlap when new range encompasses existing', () => {
      const result = domain.detectOverlap(
        new Date('2024-06-01'),
        new Date('2024-06-15'),
        approvedRequests,
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-1');
    });

    it('should detect overlap on exact boundary (same day)', () => {
      // New request ends exactly when existing starts
      const result = domain.detectOverlap(
        new Date('2024-06-01'),
        new Date('2024-06-05'),
        approvedRequests,
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-1');
    });

    it('should detect overlap with second approved request', () => {
      const result = domain.detectOverlap(
        new Date('2024-07-03'),
        new Date('2024-07-08'),
        approvedRequests,
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-2');
    });

    it('should not detect overlap when request is before all approved', () => {
      const result = domain.detectOverlap(
        new Date('2024-05-01'),
        new Date('2024-06-04'),
        approvedRequests,
      );
      expect(result).toBeNull();
    });

    it('should not detect overlap when request is after all approved', () => {
      const result = domain.detectOverlap(
        new Date('2024-07-06'),
        new Date('2024-07-10'),
        approvedRequests,
      );
      expect(result).toBeNull();
    });
  });
});
