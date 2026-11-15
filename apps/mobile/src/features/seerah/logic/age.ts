import type { SeerahEra } from '../types';

/** The timeline counts completed years of the Prophet's life as the book does: one tick per age, 0 to 63. */
export const AGE_MIN = 0;
export const AGE_MAX = 63;
export const AGE_COUNT = AGE_MAX - AGE_MIN + 1;
/** The Hijra falls at age 53 (Q6): age 52 is year 1 before it, age 53 is year 1 after it. */
export const HIJRA_AGE = 53;

export type StageKey = 'childhood' | 'adolescence' | 'youth' | 'maturity';

export type LifeStage = { key: StageKey; from: number; to: number };

/** الطفولة ٠–١١، الصبا ١٢–١٩، الشباب ٢٠–٣٩، الكهولة ٤٠–٦٣ (developer decision, 14 Nov 2026). */
export const LIFE_STAGES: readonly LifeStage[] = [
  { key: 'childhood', from: 0, to: 11 },
  { key: 'adolescence', from: 12, to: 19 },
  { key: 'youth', from: 20, to: 39 },
  { key: 'maturity', from: 40, to: 63 },
];

export function isAge(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= AGE_MIN && value <= AGE_MAX;
}

export function clampAge(age: number): number {
  'worklet';
  return Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(age)));
}

/** The life stage of an age, or null outside 0..63. */
export function stageOfAge(age: number): LifeStage | null {
  if (!isAge(age)) {
    return null;
  }
  return LIFE_STAGES.find((stage) => age >= stage.from && age <= stage.to) ?? null;
}

export function stageByKey(key: StageKey): LifeStage {
  const stage = LIFE_STAGES.find((candidate) => candidate.key === key);
  if (stage === undefined) {
    throw new Error(`Unknown life stage ${key}`);
  }
  return stage;
}

export type EraYear = { era: SeerahEra; year: number };

/**
 * The Hijri year of an age, shown only as a small detail on the event page. Age 0..52 is «N ق.هـ» with N = 53 − age;
 * age 53 and later is «(age − 52) هـ». Null outside 0..63. The caller formats it with the `seerah.era.*` strings.
 */
export function eraOfAge(age: number): EraYear | null {
  if (!isAge(age)) {
    return null;
  }
  return age < HIJRA_AGE ? { era: 'bh', year: HIJRA_AGE - age } : { era: 'ah', year: age - (HIJRA_AGE - 1) };
}

/** An event's age as text parts: a single age, a range, or none (the «غير محدد» bucket). */
export type AgeSpan = { from: number; to: number } | null;

export function ageSpanOf(event: { ageFrom: number | null; ageTo: number | null }): AgeSpan {
  if (event.ageFrom === null) {
    return null;
  }
  return { from: event.ageFrom, to: event.ageTo ?? event.ageFrom };
}
