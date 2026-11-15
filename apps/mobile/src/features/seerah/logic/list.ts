import type { SeerahEvent } from '../types';
import { LIFE_STAGES, stageOfAge, type StageKey } from './age';

export type ListAgeGroup = { age: number; events: SeerahEvent[] };
export type ListStageSection = { stage: StageKey; from: number; to: number; ages: ListAgeGroup[] };

export type EventListGroups = {
  stages: ListStageSection[];
  /** The «غير محدد» bucket, in book order. */
  unspecified: SeerahEvent[];
};

/**
 * The list view's structure: life stage, then age, then events in book order, and the «غير محدد» bucket last. An event
 * that spans several ages is listed under its first age, so every event appears once. Empty stages are left out.
 */
export function groupEventsForList(events: readonly SeerahEvent[]): EventListGroups {
  const ordered = [...events].sort((a, b) => a.position - b.position);
  const unspecified = ordered.filter((event) => event.ageFrom === null);
  const stages: ListStageSection[] = [];
  for (const stage of LIFE_STAGES) {
    const inStage = ordered.filter((event) => event.ageFrom !== null && stageOfAge(event.ageFrom)?.key === stage.key);
    if (inStage.length === 0) {
      continue;
    }
    const ages = [...new Set(inStage.map((event) => event.ageFrom as number))]
      .sort((a, b) => a - b)
      .map((age) => ({ age, events: inStage.filter((event) => event.ageFrom === age) }));
    stages.push({ stage: stage.key, from: stage.from, to: stage.to, ages });
  }
  return { stages, unspecified };
}

export type Neighbours = { previous: SeerahEvent | null; next: SeerahEvent | null; index: number; total: number };

/** The event page's previous and next, in book order (an event in the «غير محدد» bucket sits between its book neighbours). */
export function neighbours(events: readonly SeerahEvent[], id: string): Neighbours {
  const ordered = [...events].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((event) => event.id === id);
  return {
    previous: index > 0 ? (ordered[index - 1] ?? null) : null,
    next: index >= 0 && index < ordered.length - 1 ? (ordered[index + 1] ?? null) : null,
    index: index + 1,
    total: ordered.length,
  };
}
