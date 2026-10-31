import type { Locale } from '@/core/i18n/locale';

import type { AzkarItemDetail, AzkarVariation } from './model';

export type ReaderUnitKind = 'recitation' | 'read';

/**
 * What the reader shows and counts. `requiredCount` comes only from a sourced count and is `null` when none
 * is sourced; it is never read as 1. `preface` steps lead into the unit, `afterword` steps follow the last
 * counted unit of an entry. `unitKey` includes the active variation for read units and repeat groups; recitation
 * unit keys are item keys, which are already per variation, so switching alternatives never mixes counts.
 */
export type ReaderUnit = {
  unitKey: string;
  entryKey: string;
  kind: ReaderUnitKind;
  requiredCount: number | null;
  /** The entry's alternatives, when the reader can switch between them (empty otherwise). */
  variations: AzkarVariation[];
  activeVariation: string;
  preface: AzkarItemDetail[];
  body: AzkarItemDetail[];
  afterword: AzkarItemDetail[];
};

/** The alternatives of an entry and the one whose items are passed in. */
export type EntrySelection = {
  variations: AzkarVariation[];
  activeVariation: string;
};

/** One entry's items for the units builder. Without a selection, the items' own variation is the active one. */
export type UnitSource = {
  entryKey: string;
  items: readonly AzkarItemDetail[];
  variations?: AzkarVariation[];
  activeVariation?: string;
};

type Block =
  | { kind: 'item'; item: AzkarItemDetail }
  | { kind: 'group'; group: number; variationKey: string; items: AzkarItemDetail[] };

/** An item with no Arabic text is dropped from the Arabic interface. Quran segments are Arabic by definition. */
export function hasArabic(item: AzkarItemDetail): boolean {
  return item.segments.some((segment) => segment.kind === 'quran' || segment.textAr !== null);
}

/** Items shown in a locale. English-only steps stay in English only. */
export function visibleItems(items: readonly AzkarItemDetail[], locale: Locale): AzkarItemDetail[] {
  return locale === 'ar' ? items.filter(hasArabic) : [...items];
}

/**
 * Builds the reader units for one entry. `items` must be one variation (the active one), in position order.
 * - A recitation item outside a repeat group is one unit; its count is the item's `requiredCount`.
 * - Items sharing a `repeat_group` (within one variation) form one unit counted by `repeat_times`.
 * - Instruction and narration steps attach as `preface` to the next counted unit; steps after the last counted
 *   unit attach as its `afterword`.
 * - An entry with no counted unit becomes one `read` unit with a `null` count, holding all its steps.
 */
export function buildReaderUnits(
  entryKey: string,
  items: readonly AzkarItemDetail[],
  locale: Locale,
  selection?: EntrySelection,
): ReaderUnit[] {
  const visible = visibleItems(items, locale);
  const first = visible[0];
  if (first === undefined) {
    return [];
  }

  const variations = selection?.variations ?? [];
  const activeVariation = selection?.activeVariation ?? first.variationKey;
  const units = buildUnits(entryKey, first.variationKey, visible);

  return units.map((unit) => ({ ...unit, variations, activeVariation }));
}

/** Category units are the concatenation of each entry's units, in entry order. Each entry counts once. */
export function buildCategoryUnits(entries: readonly UnitSource[], locale: Locale): ReaderUnit[] {
  return entries.flatMap((entry) =>
    buildReaderUnits(
      entry.entryKey,
      entry.items,
      locale,
      entry.activeVariation === undefined
        ? undefined
        : { variations: entry.variations ?? [], activeVariation: entry.activeVariation },
    ),
  );
}

function buildUnits(
  entryKey: string,
  variation: string,
  visible: readonly AzkarItemDetail[],
): Omit<ReaderUnit, 'variations' | 'activeVariation'>[] {
  const blocks = toBlocks(visible);
  const units: Omit<ReaderUnit, 'variations' | 'activeVariation'>[] = [];
  let pending: AzkarItemDetail[] = [];

  for (const block of blocks) {
    if (block.kind === 'item') {
      const { item } = block;
      if (item.kind === 'recitation') {
        units.push({
          unitKey: item.itemKey,
          entryKey,
          kind: 'recitation',
          requiredCount: item.requiredCount,
          preface: pending,
          body: [item],
          afterword: [],
        });
        pending = [];
      } else {
        pending.push(item);
      }
      continue;
    }

    if (block.items.some((item) => item.kind === 'recitation')) {
      units.push({
        unitKey: `${entryKey}:${block.variationKey}:g${block.group}`,
        entryKey,
        kind: 'recitation',
        requiredCount: block.items.find((item) => item.repeatTimes !== null)?.repeatTimes ?? null,
        preface: pending,
        body: block.items,
        afterword: [],
      });
      pending = [];
    } else {
      pending.push(...block.items);
    }
  }

  if (units.length === 0) {
    return [
      {
        unitKey: `${entryKey}:${variation}:read`,
        entryKey,
        kind: 'read',
        requiredCount: null,
        preface: [],
        body: [...visible],
        afterword: [],
      },
    ];
  }

  const last = units.at(-1);
  if (last !== undefined && pending.length > 0) {
    last.afterword = pending;
  }

  return units;
}

function toBlocks(items: readonly AzkarItemDetail[]): Block[] {
  const blocks: Block[] = [];
  const groups = new Map<string, Extract<Block, { kind: 'group' }>>();

  for (const item of items) {
    if (item.repeatGroup === null) {
      blocks.push({ kind: 'item', item });
      continue;
    }

    const key = `${item.variationKey}\u0000${item.repeatGroup}`;
    let group = groups.get(key);
    if (group === undefined) {
      group = { kind: 'group', group: item.repeatGroup, variationKey: item.variationKey, items: [] };
      groups.set(key, group);
      blocks.push(group);
    }
    group.items.push(item);
  }

  return blocks;
}
