import type { KhatmaLog, KhatmaPlan } from './model';
import { MUSHAF_PAGE_COUNT } from './model';

/** Local calendar date as `yyyy-mm-dd` (not UTC). */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid local date format "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid local date "${dateStr}".`);
  }
  return { year, month, day };
}

export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseLocalDate(dateStr);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

/** Whole calendar days from `fromDateStr` to `toDateStr` (local dates). */
export function diffDays(fromDateStr: string, toDateStr: string): number {
  const from = parseLocalDate(fromDateStr);
  const to = parseLocalDate(toDateStr);
  const fromDate = new Date(from.year, from.month - 1, from.day);
  const toDate = new Date(to.year, to.month - 1, to.day);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

export function pagesRemaining(startPage: number): number {
  return MUSHAF_PAGE_COUNT - startPage + 1;
}

/** Pages due per remaining plan day; if the plan ends today, all remaining pages are due. */
export function dailyTarget(pagesLeft: number, daysLeft: number): number {
  if (daysLeft <= 0) {
    return pagesLeft;
  }
  return Math.ceil(pagesLeft / daysLeft);
}

/** 1-based plan day number, clamped to `[1, durationDays]`. */
export function planDayIndex(startDate: string, today: string, durationDays: number): number {
  const offset = diffDays(startDate, today);
  const index = offset + 1;
  return Math.min(Math.max(index, 1), durationDays);
}

export type PlanProgress = {
  dayIndex: number;
  pagesRead: number;
  pagesTotal: number;
  pagesLeft: number;
  daysLeft: number;
  todayTarget: number;
  loggedDates: Set<string>;
  completed: boolean;
};

/**
 * Derives planner progress for `today`.
 *
 * `pagesTotal` is the mushaf page count from the plan's start verse (resolved by the caller).
 * Missed days are not penalized: `todayTarget` always redistributes remaining pages over remaining days.
 */
export function planProgress(
  plan: Pick<KhatmaPlan, 'startDate' | 'durationDays'>,
  logs: readonly Pick<KhatmaLog, 'date' | 'pagesRead'>[],
  today: string,
  pagesTotal: number,
): PlanProgress {
  const dayIndex = planDayIndex(plan.startDate, today, plan.durationDays);
  const endDate = addDays(plan.startDate, plan.durationDays - 1);
  const effectiveToday = today < plan.startDate ? plan.startDate : today;
  const daysLeft = Math.max(0, diffDays(effectiveToday, endDate) + 1);

  const pagesRead = logs.reduce((sum, log) => sum + log.pagesRead, 0);
  const pagesLeft = Math.max(0, pagesTotal - pagesRead);
  const todayTarget = dailyTarget(pagesLeft, daysLeft);
  const loggedDates = new Set(logs.map((log) => log.date));
  const completed = pagesRead >= pagesTotal;

  return {
    dayIndex,
    pagesRead,
    pagesTotal,
    pagesLeft,
    daysLeft,
    todayTarget,
    loggedDates,
    completed,
  };
}
