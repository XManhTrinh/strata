import { expandRecurrence, RecurrencePattern } from '../recurrence.domain';

describe('RecurrenceDomain', () => {
  describe('expandRecurrence - DAILY', () => {
    it('should generate daily instances starting from the day after startDate', () => {
      const pattern: RecurrencePattern = { frequency: 'DAILY', count: 3 };
      const start = new Date('2024-06-10');

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2024-06-11'));
      expect(results[1]).toEqual(new Date('2024-06-12'));
      expect(results[2]).toEqual(new Date('2024-06-13'));
    });

    it('should stop at endDate', () => {
      const pattern: RecurrencePattern = {
        frequency: 'DAILY',
        endDate: new Date('2024-06-13'),
      };
      const start = new Date('2024-06-10');

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(3);
      expect(results[2]).toEqual(new Date('2024-06-13'));
    });

    it('should stop at count even if endDate is later', () => {
      const pattern: RecurrencePattern = {
        frequency: 'DAILY',
        count: 2,
        endDate: new Date('2024-12-31'),
      };
      const start = new Date('2024-06-10');

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(2);
    });

    it('should stop at 365 days max from start when no endDate or count', () => {
      const pattern: RecurrencePattern = { frequency: 'DAILY' };
      const start = new Date('2024-01-01');

      const results = expandRecurrence(pattern, start);

      // 365 days from Jan 1 = Dec 31, so instances from Jan 2 to Dec 31 = 365 instances
      expect(results.length).toBeLessThanOrEqual(366);
      const lastDate = results[results.length - 1];
      const maxDate = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
      expect(lastDate.getTime()).toBeLessThanOrEqual(maxDate.getTime());
    });
  });

  describe('expandRecurrence - WEEKLY', () => {
    it('should generate instances on specified days of week', () => {
      // Start on Monday June 10, generate on Tue(2) and Thu(4)
      const pattern: RecurrencePattern = {
        frequency: 'WEEKLY',
        daysOfWeek: [2, 4], // Tuesday, Thursday
        count: 4,
      };
      const start = new Date('2024-06-10'); // Monday

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(4);
      // Jun 11 (Tue), Jun 13 (Thu), Jun 18 (Tue), Jun 20 (Thu)
      expect(results[0]).toEqual(new Date('2024-06-11'));
      expect(results[1]).toEqual(new Date('2024-06-13'));
      expect(results[2]).toEqual(new Date('2024-06-18'));
      expect(results[3]).toEqual(new Date('2024-06-20'));
    });

    it('should return empty array when no days of week specified', () => {
      const pattern: RecurrencePattern = {
        frequency: 'WEEKLY',
        daysOfWeek: [],
        count: 5,
      };
      const start = new Date('2024-06-10');

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(0);
    });

    it('should respect endDate', () => {
      const pattern: RecurrencePattern = {
        frequency: 'WEEKLY',
        daysOfWeek: [1], // Monday
        endDate: new Date('2024-06-24'),
      };
      const start = new Date('2024-06-10'); // Monday

      const results = expandRecurrence(pattern, start);

      // Jun 17 (Mon), Jun 24 (Mon)
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(new Date('2024-06-17'));
      expect(results[1]).toEqual(new Date('2024-06-24'));
    });
  });

  describe('expandRecurrence - MONTHLY', () => {
    it('should generate instances on the same day each month', () => {
      const pattern: RecurrencePattern = {
        frequency: 'MONTHLY',
        dayOfMonth: 15,
        count: 3,
      };
      const start = new Date('2024-06-10');

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2024-07-15'));
      expect(results[1]).toEqual(new Date('2024-08-15'));
      expect(results[2]).toEqual(new Date('2024-09-15'));
    });

    it('should clamp to last day of month when dayOfMonth exceeds month length', () => {
      const pattern: RecurrencePattern = {
        frequency: 'MONTHLY',
        dayOfMonth: 31,
        count: 3,
      };
      const start = new Date('2024-01-15');

      const results = expandRecurrence(pattern, start);

      // Feb 2024 has 29 days (leap year), Mar has 31, Apr has 30
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2024-02-29'));
      expect(results[1]).toEqual(new Date('2024-03-31'));
      expect(results[2]).toEqual(new Date('2024-04-30'));
    });

    it('should use start date day when dayOfMonth is not specified', () => {
      const pattern: RecurrencePattern = {
        frequency: 'MONTHLY',
        count: 2,
      };
      const start = new Date('2024-06-20');

      const results = expandRecurrence(pattern, start);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(new Date('2024-07-20'));
      expect(results[1]).toEqual(new Date('2024-08-20'));
    });
  });

  describe('expandRecurrence - YEARLY', () => {
    it('should generate instances on the same month/day each year', () => {
      const pattern: RecurrencePattern = {
        frequency: 'YEARLY',
        count: 3,
      };
      const start = new Date('2024-03-15');
      const maxDate = new Date('2028-01-01');

      const results = expandRecurrence(pattern, start, maxDate);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2025-03-15'));
      expect(results[1]).toEqual(new Date('2026-03-15'));
      expect(results[2]).toEqual(new Date('2027-03-15'));
    });

    it('should handle Feb 29 on non-leap years by using Feb 28', () => {
      const pattern: RecurrencePattern = {
        frequency: 'YEARLY',
        count: 2,
      };
      const start = new Date('2024-02-29'); // 2024 is a leap year
      const maxDate = new Date('2027-01-01');

      const results = expandRecurrence(pattern, start, maxDate);

      // 2025 is not a leap year, so Feb 28
      expect(results[0]).toEqual(new Date('2025-02-28'));
      // 2026 is not a leap year
      expect(results[1]).toEqual(new Date('2026-02-28'));
    });

    it('should stop at maxDate (365 days from start)', () => {
      const pattern: RecurrencePattern = { frequency: 'YEARLY' };
      const start = new Date('2024-06-15');

      const results = expandRecurrence(pattern, start);

      // 365 days from June 15, 2024 is June 15, 2025
      // The yearly instance would be June 15, 2025 which is exactly at the boundary
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should respect count limit', () => {
      const pattern: RecurrencePattern = {
        frequency: 'YEARLY',
        count: 1,
      };
      const start = new Date('2020-01-01');
      const maxDate = new Date('2030-12-31');

      const results = expandRecurrence(pattern, start, maxDate);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(new Date('2021-01-01'));
    });
  });

  describe('expandRecurrence - bounds enforcement', () => {
    it('should not generate instances beyond maxDate parameter', () => {
      const pattern: RecurrencePattern = { frequency: 'DAILY', count: 1000 };
      const start = new Date('2024-06-10');
      const maxDate = new Date('2024-06-15');

      const results = expandRecurrence(pattern, start, maxDate);

      expect(results).toHaveLength(5);
      expect(results[results.length - 1]).toEqual(new Date('2024-06-15'));
    });

    it('should prefer the more restrictive limit (endDate vs maxDate)', () => {
      const pattern: RecurrencePattern = {
        frequency: 'DAILY',
        endDate: new Date('2024-06-12'), // more restrictive
      };
      const start = new Date('2024-06-10');
      const maxDate = new Date('2024-12-31'); // less restrictive

      const results = expandRecurrence(pattern, start, maxDate);

      expect(results).toHaveLength(2);
    });
  });
});
