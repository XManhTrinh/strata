import { BadRequestException } from '@nestjs/common';
import { BudgetingDomain } from '../budgeting.domain';

describe('BudgetingDomain', () => {
  let domain: BudgetingDomain;

  beforeEach(() => {
    domain = new BudgetingDomain();
  });

  // ─── Create Budget Validation ─────────────────────────────────────────────

  describe('validateCreateBudget', () => {
    const validPayload = {
      departmentId: 'dept-123',
      fiscalPeriod: '2024-Q1',
      amount: 50000,
    };

    it('should validate a valid payload', () => {
      const result = domain.validateCreateBudget(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should accept amount of zero', () => {
      const result = domain.validateCreateBudget({ ...validPayload, amount: 0 });
      expect(result.amount).toBe(0);
    });

    it('should accept large amounts', () => {
      const result = domain.validateCreateBudget({ ...validPayload, amount: 1000000000 });
      expect(result.amount).toBe(1000000000);
    });

    it('should reject missing required fields', () => {
      expect(() => domain.validateCreateBudget({})).toThrow(BadRequestException);
    });

    it('should reject missing departmentId', () => {
      expect(() =>
        domain.validateCreateBudget({ fiscalPeriod: '2024-Q1', amount: 100 }),
      ).toThrow(BadRequestException);
    });

    it('should reject missing fiscalPeriod', () => {
      expect(() =>
        domain.validateCreateBudget({ departmentId: 'dept-1', amount: 100 }),
      ).toThrow(BadRequestException);
    });

    it('should reject missing amount', () => {
      expect(() =>
        domain.validateCreateBudget({ departmentId: 'dept-1', fiscalPeriod: '2024-Q1' }),
      ).toThrow(BadRequestException);
    });

    it('should reject negative amount', () => {
      expect(() =>
        domain.validateCreateBudget({ ...validPayload, amount: -1 }),
      ).toThrow(BadRequestException);
    });

    it('should reject negative amount with large magnitude', () => {
      expect(() =>
        domain.validateCreateBudget({ ...validPayload, amount: -50000 }),
      ).toThrow(BadRequestException);
    });

    it('should reject empty departmentId', () => {
      expect(() =>
        domain.validateCreateBudget({ ...validPayload, departmentId: '' }),
      ).toThrow(BadRequestException);
    });

    it('should reject empty fiscalPeriod', () => {
      expect(() =>
        domain.validateCreateBudget({ ...validPayload, fiscalPeriod: '' }),
      ).toThrow(BadRequestException);
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateCreateBudget({ ...validPayload, extra: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Update Budget Validation ─────────────────────────────────────────────

  describe('validateUpdateBudget', () => {
    it('should validate a partial update with amount', () => {
      const result = domain.validateUpdateBudget({ amount: 75000 });
      expect(result).toEqual({ amount: 75000 });
    });

    it('should validate a partial update with departmentId', () => {
      const result = domain.validateUpdateBudget({ departmentId: 'dept-new' });
      expect(result).toEqual({ departmentId: 'dept-new' });
    });

    it('should validate a partial update with fiscalPeriod', () => {
      const result = domain.validateUpdateBudget({ fiscalPeriod: '2024-Q2' });
      expect(result).toEqual({ fiscalPeriod: '2024-Q2' });
    });

    it('should validate a full update', () => {
      const payload = {
        departmentId: 'dept-new',
        fiscalPeriod: '2024-Q2',
        amount: 60000,
      };
      const result = domain.validateUpdateBudget(payload);
      expect(result).toEqual(payload);
    });

    it('should reject empty payload', () => {
      expect(() => domain.validateUpdateBudget({})).toThrow(BadRequestException);
    });

    it('should reject negative amount', () => {
      expect(() => domain.validateUpdateBudget({ amount: -1 })).toThrow(BadRequestException);
    });

    it('should accept zero amount', () => {
      const result = domain.validateUpdateBudget({ amount: 0 });
      expect(result).toEqual({ amount: 0 });
    });

    it('should reject unknown fields', () => {
      expect(() =>
        domain.validateUpdateBudget({ amount: 50000, unknown: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Non-Negative Amount Validation ───────────────────────────────────────

  describe('validateNonNegativeAmount', () => {
    it('should accept zero', () => {
      expect(() => domain.validateNonNegativeAmount(0)).not.toThrow();
    });

    it('should accept positive values', () => {
      expect(() => domain.validateNonNegativeAmount(100)).not.toThrow();
    });

    it('should accept large positive values', () => {
      expect(() => domain.validateNonNegativeAmount(999999999)).not.toThrow();
    });

    it('should accept decimal positive values', () => {
      expect(() => domain.validateNonNegativeAmount(100.50)).not.toThrow();
    });

    it('should reject negative values', () => {
      expect(() => domain.validateNonNegativeAmount(-1)).toThrow(BadRequestException);
    });

    it('should reject large negative values', () => {
      expect(() => domain.validateNonNegativeAmount(-50000)).toThrow(BadRequestException);
    });

    it('should reject NaN', () => {
      expect(() => domain.validateNonNegativeAmount(NaN)).toThrow(BadRequestException);
    });
  });

  // ─── Variance Calculation ─────────────────────────────────────────────────

  describe('calculateVariance', () => {
    it('should calculate positive variance (under budget)', () => {
      const result = domain.calculateVariance(100000, 80000);
      expect(result).toEqual({
        budgeted: 100000,
        actual: 80000,
        variance: 20000,
        overBudget: false,
      });
    });

    it('should calculate zero variance (exactly on budget)', () => {
      const result = domain.calculateVariance(50000, 50000);
      expect(result).toEqual({
        budgeted: 50000,
        actual: 50000,
        variance: 0,
        overBudget: false,
      });
    });

    it('should calculate negative variance (over budget)', () => {
      const result = domain.calculateVariance(50000, 70000);
      expect(result).toEqual({
        budgeted: 50000,
        actual: 70000,
        variance: -20000,
        overBudget: true,
      });
    });

    it('should handle zero budgeted amount with zero actual', () => {
      const result = domain.calculateVariance(0, 0);
      expect(result).toEqual({
        budgeted: 0,
        actual: 0,
        variance: 0,
        overBudget: false,
      });
    });

    it('should handle zero budgeted amount with positive actual', () => {
      const result = domain.calculateVariance(0, 1000);
      expect(result).toEqual({
        budgeted: 0,
        actual: 1000,
        variance: -1000,
        overBudget: true,
      });
    });

    it('should handle budgeted amount with zero actual spend', () => {
      const result = domain.calculateVariance(100000, 0);
      expect(result).toEqual({
        budgeted: 100000,
        actual: 0,
        variance: 100000,
        overBudget: false,
      });
    });
  });
});
