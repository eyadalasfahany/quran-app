import { khatmaPlanStatuses } from '@/core/db/user/schema';

export const MUSHAF_PAGE_COUNT = 604;

export type KhatmaPlanStatus = (typeof khatmaPlanStatuses)[number];

export type KhatmaPlan = {
  id: string;
  durationDays: number;
  startVerseId: number;
  startDate: string;
  status: KhatmaPlanStatus;
  completedAt: number | null;
  clientUpdatedAt: number;
};

export type KhatmaLog = {
  id: string;
  planId: string;
  date: string;
  pagesRead: number;
  lastVerseId: number;
  clientUpdatedAt: number;
};

export class KhatmaValidationError extends Error {
  readonly code: 'duration_invalid' | 'pages_read_invalid' | 'plan_status_invalid';

  constructor(code: 'duration_invalid' | 'pages_read_invalid' | 'plan_status_invalid') {
    super(code);
    this.name = 'KhatmaValidationError';
    this.code = code;
  }
}

const khatmaPlanStatusSet: ReadonlySet<string> = new Set(khatmaPlanStatuses);

export function isKhatmaPlanStatus(value: string): value is KhatmaPlanStatus {
  return khatmaPlanStatusSet.has(value);
}
