export const KHATMA_DURATION_OPTIONS = [7, 15, 30, 60] as const;

export type KhatmaDurationDays = (typeof KHATMA_DURATION_OPTIONS)[number];

export const DEFAULT_KHATMA_DURATION: KhatmaDurationDays = 30;
