import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import {
  validateDateRange,
  validateStatusTransition,
  checkOverlap,
  validateBalanceSufficiency,
  calculateAvailableBalance,
} from '../calendar.domain';

describe('CalendarDomain', () => {
  describe('validateDateRange', () => {
    it('should pass when start is before end', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      expect(() => validateDateRange(start, end)).not.toThrow();
    });

    it('should throw BadRequestException when start equals end', () => {
      const date = new Date('2024-06-15T10:00:00Z');
      expect(() => validateDateRange(date, date)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when start is after end', () => {
      const start = new Date('2024-06-20');
      const end = new Date('2024-06-10');
      expect(() => validateDateRange(start, end)).toThrow(BadRequestException);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow PENDING → APPROVED', () => {
      expect(() => validateStatusTransition('PENDING', 'APPROVED')).not.toThrow();
    });

    it('should allow PENDING → REJECTED', () => {
      expect(() => validateStatusTransition('PENDING', 'REJECTED')).not.toThrow();
    });

    it('should allow APPROVED → CANCELLED', () => {
      expect(() => validateStatusTransition('APPROVED', 'CANCELLED')).not.toThrow();
    });

    it('should throw for PENDING → CANCELLED', () => {
      expect(() => validateStatusTransition('PENDING', 'CANCELLED')).toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw for APPROVED → APPROVED', () => {
      expect(() => validateStatusTransition('APPROVED', 'APPROVED')).toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw for REJECTED → APPROVED', () => {
      expect(() => validateStatusTransition('REJECTED', 'APPROVED')).toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw for CANCELLED → PENDING', () => {
      expect(() => validateStatusTransition('CANCELLED', 'PENDING')).toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('checkOverlap', () => {
    it('should return null when no events exist', () => {
      const result = checkOverlap(
        [],
        new Date('2024-06-10'),
        new Date('2024-06-15'),
      );
      expect(result).toBeNull();
    });

    it('should return null when ranges do not overlap', () => {
      const existing = [
        { startDate: new Date('2024-06-01'), endDate: new Date('2024-06-05') },
      ];
      const result = checkOverlap(existing, new Date('2024-06-10'), new Date('2024-06-15'));
      expect(result).toBeNull();
    });

    it('should return the overlapping event when ranges overlap', () => {
      const existing = [
        { startDate: new Date('2024-06-03'), endDate: new Date('2024-06-10') },
      ];
      const result = checkOverlap(existing, new Date('2024-06-08'), new Date('2024-06-15'));
      expect(result).toEqual(existing[0]);
    });

    it('should detect overlap when new range fully contains existing', () => {
      const existing = [
        { startDate: new Date('2024-06-05'), endDate: new Date('2024-06-08') },
      ];
      const result = checkOverlap(existing, new Date('2024-06-01'), new Date('2024-06-15'));
      expect(result).toEqual(existing[0]);
    });

    it('should detect overlap when existing fully contains new', () => {
      const existing = [
        { startDate: new Date('2024-06-01'), endDate: new Date('2024-06-15') },
      ];
      const result = checkOverlap(existing, new Date('2024-06-05'), new Date('2024-06-08'));
      expect(result).toEqual(existing[0]);
    });

    it('should not overlap when ranges share only a boundary (end == start)', () => {
      const existing = [
        { startDate: new Date('2024-06-01'), endDate: new Date('2024-06-05') },
      ];
      const result = checkOverlap(existing, new Date('2024-06-05'), new Date('2024-06-10'));
      expect(result).toBeNull();
    });

    it('should return the first overlapping event from multiple', () => {
      const existing = [
        { startDate: new Date('2024-06-01'), endDate: new Date('2024-06-05') },
        { startDate: new Date('2024-06-08'), endDate: new Date('2024-06-12') },
      ];
      const result = checkOverlap(existing, new Date('2024-06-04'), new Date('2024-06-09'));
      expect(result).toEqual(existing[0]);
    });
  });

  describe('validateBalanceSufficiency', () => {
    it('should be sufficient when available >= requested', () => {
      const result = validateBalanceSufficiency(10, 5);
      expect(result).toEqual({ sufficient: true, shortfall: 0 });
    });

    it('should be sufficient when available equals requested', () => {
      const result = validateBalanceSufficiency(5, 5);
      expect(result).toEqual({ sufficient: true, shortfall: 0 });
    });

    it('should be insufficient when available < requested', () => {
      const result = validateBalanceSufficiency(3, 5);
      expect(result).toEqual({ sufficient: false, shortfall: 2 });
    });

    it('should handle zero available balance', () => {
      const result = validateBalanceSufficiency(0, 5);
      expect(result).toEqual({ sufficient: false, shortfall: 5 });
    });

    it('should handle zero requested days', () => {
      const result = validateBalanceSufficiency(10, 0);
      expect(result).toEqual({ sufficient: true, shortfall: 0 });
    });
  });

  describe('calculateAvailableBalance', () => {
    it('should calculate correctly: 10 + 2 + 1 - 3 = 10', () => {
      const result = calculateAvailableBalance(10, 2, 1, 3);
      expect(result).toBe(10);
    });

    it('should handle all zeros', () => {
      const result = calculateAvailableBalance(0, 0, 0, 0);
      expect(result).toBe(0);
    });

    it('should handle negative adjustments', () => {
      const result = calculateAvailableBalance(25, 0, -5, 10);
      expect(result).toBe(10);
    });

    it('should allow result to be negative', () => {
      const result = calculateAvailableBalance(5, 0, 0, 10);
      expect(result).toBe(-5);
    });

    it('should handle carried over days', () => {
      const result = calculateAvailableBalance(20, 5, 0, 8);
      expect(result).toBe(17);
    });
  });
});
