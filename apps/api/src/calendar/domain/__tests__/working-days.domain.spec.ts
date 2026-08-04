import { calculateWorkingDays } from '../working-days.domain';

describe('WorkingDaysDomain', () => {
  describe('calculateWorkingDays', () => {
    it('should return 0 when start equals end', () => {
      const date = new Date('2024-06-10');
      expect(calculateWorkingDays(date, date)).toBe(0);
    });

    it('should return 0 when start is after end', () => {
      const start = new Date('2024-06-15');
      const end = new Date('2024-06-10');
      expect(calculateWorkingDays(start, end)).toBe(0);
    });

    it('should count 5 working days for a full Mon-Fri week', () => {
      // June 10, 2024 is a Monday; June 15, 2024 is Saturday
      const start = new Date('2024-06-10');
      const end = new Date('2024-06-15');
      expect(calculateWorkingDays(start, end)).toBe(5);
    });

    it('should count 0 for a weekend-only range (Sat-Mon)', () => {
      // June 8, 2024 is Saturday; June 10, 2024 is Monday
      const start = new Date('2024-06-08');
      const end = new Date('2024-06-10');
      expect(calculateWorkingDays(start, end)).toBe(0);
    });

    it('should count 1 working day for a single weekday', () => {
      // June 10, 2024 is Monday
      const start = new Date('2024-06-10');
      const end = new Date('2024-06-11');
      expect(calculateWorkingDays(start, end)).toBe(1);
    });

    it('should count 10 working days for 2 weeks', () => {
      // June 10 (Mon) to June 22 (Sat) = 10 weekdays
      const start = new Date('2024-06-10');
      const end = new Date('2024-06-22');
      expect(calculateWorkingDays(start, end)).toBe(10);
    });

    it('should count correctly for a partial week starting on Wednesday', () => {
      // June 12, 2024 is Wednesday; June 15, 2024 is Saturday
      // Wed, Thu, Fri = 3 working days
      const start = new Date('2024-06-12');
      const end = new Date('2024-06-15');
      expect(calculateWorkingDays(start, end)).toBe(3);
    });

    it('should count correctly for a range spanning multiple weeks', () => {
      // June 3 (Mon) to June 28 (Fri end-exclusive means 27 is last counted day)
      // 3 full weeks Mon-Fri + Thu Jun 27 
      // Actually Jun 3 to Jun 28: 3 weekdays remaining in first week (Mon-Fri = 5), 
      // + 2 full weeks (10), + Mon-Thu (4) = wait let me recalc
      // June 3 (Mon) to June 28 (Fri, exclusive end)
      // Week 1: Jun 3-7 = 5, Week 2: Jun 10-14 = 5, Week 3: Jun 17-21 = 5, 
      // Week 4: Jun 24-27 (Thu is last day before Jun 28) = 4
      // Total = 19
      const start = new Date('2024-06-03');
      const end = new Date('2024-06-28');
      expect(calculateWorkingDays(start, end)).toBe(19);
    });

    it('should handle month boundaries', () => {
      // Jan 29 (Mon) to Feb 2 (Fri exclusive means Thu Jan 31 + Thu Feb 1)
      // Actually Jan 29 Mon, Jan 30 Tue, Jan 31 Wed, Feb 1 Thu = 4 weekdays
      const start = new Date('2024-01-29');
      const end = new Date('2024-02-02');
      expect(calculateWorkingDays(start, end)).toBe(4);
    });

    it('should handle a single Saturday', () => {
      // June 8, 2024 is Saturday
      const start = new Date('2024-06-08');
      const end = new Date('2024-06-09');
      expect(calculateWorkingDays(start, end)).toBe(0);
    });

    it('should handle a single Sunday', () => {
      // June 9, 2024 is Sunday
      const start = new Date('2024-06-09');
      const end = new Date('2024-06-10');
      expect(calculateWorkingDays(start, end)).toBe(0);
    });
  });
});
