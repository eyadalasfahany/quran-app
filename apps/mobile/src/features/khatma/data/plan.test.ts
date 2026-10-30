import {
  addDays,
  dailyTarget,
  diffDays,
  pagesRemaining,
  planDayIndex,
  planProgress,
  toLocalDateString,
} from './plan';
import { MUSHAF_PAGE_COUNT } from './model';

describe('khatma plan math', () => {
  describe('toLocalDateString', () => {
    it('formats local calendar dates', () => {
      expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('addDays', () => {
    it('crosses month and year boundaries', () => {
      expect(addDays('2026-01-30', 2)).toBe('2026-02-01');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });
  });

  describe('diffDays', () => {
    it('counts whole local days between date strings', () => {
      expect(diffDays('2026-01-01', '2026-01-01')).toBe(0);
      expect(diffDays('2026-01-01', '2026-01-31')).toBe(30);
      expect(diffDays('2026-02-28', '2026-03-01')).toBe(1);
    });
  });

  describe('pagesRemaining', () => {
    it('counts from start page through the end of the mushaf', () => {
      expect(pagesRemaining(1)).toBe(MUSHAF_PAGE_COUNT);
      expect(pagesRemaining(MUSHAF_PAGE_COUNT)).toBe(1);
    });
  });

  describe('dailyTarget', () => {
    it('ceil-divides remaining pages by remaining days', () => {
      expect(dailyTarget(MUSHAF_PAGE_COUNT, 30)).toBe(21);
      expect(dailyTarget(MUSHAF_PAGE_COUNT, 7)).toBe(87);
      expect(dailyTarget(3, 5)).toBe(1);
    });

    it('returns all remaining pages when no days are left', () => {
      expect(dailyTarget(12, 0)).toBe(12);
      expect(dailyTarget(12, -2)).toBe(12);
    });
  });

  describe('planDayIndex', () => {
    it('is 1-based and clamps before start and after end', () => {
      expect(planDayIndex('2026-03-10', '2026-03-05', 30)).toBe(1);
      expect(planDayIndex('2026-03-10', '2026-03-10', 30)).toBe(1);
      expect(planDayIndex('2026-03-10', '2026-03-12', 30)).toBe(3);
      expect(planDayIndex('2026-03-10', '2026-05-01', 30)).toBe(30);
    });
  });

  describe('planProgress', () => {
    const plan = { startDate: '2026-01-01', durationDays: 30 };

    it('redistributes after a missed day with zero pages read', () => {
      const progress = planProgress(plan, [], '2026-01-03', MUSHAF_PAGE_COUNT);
      expect(progress.dayIndex).toBe(3);
      expect(progress.pagesRead).toBe(0);
      expect(progress.daysLeft).toBe(28);
      expect(progress.todayTarget).toBe(22);
    });

    it('detects completion when logged pages meet the total', () => {
      const progress = planProgress(
        plan,
        [
          { date: '2026-01-01', pagesRead: 300 },
          { date: '2026-01-02', pagesRead: 304 },
        ],
        '2026-01-02',
        MUSHAF_PAGE_COUNT,
      );
      expect(progress.completed).toBe(true);
      expect(progress.pagesLeft).toBe(0);
    });

    it('tracks logged dates', () => {
      const progress = planProgress(plan, [{ date: '2026-01-01', pagesRead: 5 }], '2026-01-02', 100);
      expect(progress.loggedDates).toEqual(new Set(['2026-01-01']));
    });
  });
});
