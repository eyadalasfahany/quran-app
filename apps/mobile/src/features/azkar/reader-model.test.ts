import { makeUnit } from '../../../jest/azkar-ui-fixtures';
import {
  allUnitsDone,
  completedUnitKeys,
  moveDirection,
  nextUnitIndex,
  readerProgress,
  referenceNumber,
  resolveReaderPosition,
  showsCounter,
} from './reader-model';

describe('allUnitsDone', () => {
  it('is true only when every unit is complete, and false for an empty session', () => {
    expect(allUnitsDone(units, new Set(['a', 'b']))).toBe(false);
    expect(allUnitsDone(units, new Set(['a', 'b', 'c']))).toBe(true);
    expect(allUnitsDone([], new Set())).toBe(false);
  });
});

const units = [makeUnit({ unitKey: 'a' }), makeUnit({ unitKey: 'b' }), makeUnit({ unitKey: 'c' })];

describe('resolveReaderPosition', () => {
  it('resumes at the first incomplete unit', () => {
    expect(resolveReaderPosition(null, units, new Set(['a']))).toEqual({ index: 1, finished: false });
  });

  it('stays on the last unit, not the completion screen, when every unit is complete but the session is not marked', () => {
    expect(resolveReaderPosition(null, units, new Set(['a', 'b', 'c']))).toEqual({ index: 2, finished: false });
  });

  it('shows the completion screen when the session is marked complete, even on reopen', () => {
    expect(resolveReaderPosition(null, units, new Set(), true)).toEqual({ index: 2, finished: true });
    expect(resolveReaderPosition(null, units, new Set(['a']), true)).toEqual({ index: 2, finished: true });
  });

  it('shows the completion screen for a marked session even after the user moved to a unit', () => {
    expect(resolveReaderPosition(0, units, new Set(), true)).toEqual({ index: 2, finished: true });
  });

  it('keeps the unit the user moved to', () => {
    expect(resolveReaderPosition(2, units, new Set())).toEqual({ index: 2, finished: false });
  });

  it('clamps a stale index into range', () => {
    expect(resolveReaderPosition(9, units, new Set())).toEqual({ index: 2, finished: false });
    expect(resolveReaderPosition(-3, units, new Set())).toEqual({ index: 0, finished: false });
  });

  it('shows the completion screen on request and for an empty category', () => {
    expect(resolveReaderPosition('finished', units, new Set())).toEqual({ index: 2, finished: true });
    expect(resolveReaderPosition(null, [], new Set())).toEqual({ index: 0, finished: true });
  });
});

describe('readerProgress', () => {
  it('counts the unit being read, and every unit once finished', () => {
    expect(readerProgress({ index: 4, finished: false }, 24)).toEqual({ current: 5, fraction: 5 / 24 });
    expect(readerProgress({ index: 23, finished: true }, 24)).toEqual({ current: 24, fraction: 1 });
  });

  it('is empty for an empty category', () => {
    expect(readerProgress({ index: 0, finished: true }, 0)).toEqual({ current: 0, fraction: 0 });
  });
});

describe('completedUnitKeys', () => {
  it('keeps only units with a completion time', () => {
    expect([...completedUnitKeys([{ itemKey: 'a', completedAt: 1 }, { itemKey: 'b', completedAt: null }])]).toEqual(['a']);
  });
});

describe('referenceNumber', () => {
  it('formats plain numbers with Arabic-Indic digits in Arabic', () => {
    expect(referenceNumber('75', 'ar')).toBe('٧٥');
    expect(referenceNumber('75', 'en')).toBe('75');
  });

  it('keeps a non-numeric reference as written', () => {
    expect(referenceNumber('FIXTURE-001', 'ar')).toBe('FIXTURE-001');
  });
});

describe('showsCounter', () => {
  it('is a repetition line for a sourced count above 1 only', () => {
    expect(showsCounter(3)).toBe(true);
    expect(showsCounter(2)).toBe(true);
    // A count of 1 is one recitation: it has no repetition line (the ring itself still shows, ADR 0031 §6).
    expect(showsCounter(1)).toBe(false);
    // No sourced count is never a repetition line (it is not defaulted to 1).
    expect(showsCounter(null)).toBe(false);
    expect(showsCounter(0)).toBe(false);
  });
});

describe('nextUnitIndex', () => {
  it('moves to the next unit that is not done', () => {
    expect(nextUnitIndex(units, new Set(['a']), 0)).toBe(1);
    expect(nextUnitIndex(units, new Set(['a', 'b']), 0)).toBe(2);
  });

  it('skips finished units ahead, so the reader never lands on one', () => {
    expect(nextUnitIndex(units, new Set(['b']), 0)).toBe(2);
  });

  it('wraps to the first unit not done when none ahead is open', () => {
    // The last incomplete unit is the one just finished: the reader resumes at the earlier open unit.
    expect(nextUnitIndex(units, new Set(['b', 'c']), 2)).toBe(0);
  });

  it('goes to the last unit once every unit is done, so «إتمام» shows there', () => {
    expect(nextUnitIndex(units, new Set(['a', 'b', 'c']), 0)).toBe(2);
    // While one unit is still open, the reader goes to that one instead.
    expect(nextUnitIndex(units, new Set(['b', 'c']), 0)).toBe(0);
  });

  it('stays on the last unit when it is the only one left', () => {
    expect(nextUnitIndex(units, new Set(['a', 'b', 'c']), 2)).toBe(2);
  });

  it('is 0 for an empty session', () => {
    expect(nextUnitIndex([], new Set(), 0)).toBe(0);
  });
});

describe('moveDirection', () => {
  it('is forward for a move to a later unit or the same one, and back for an earlier one', () => {
    expect(moveDirection(0, 1)).toBe(1);
    expect(moveDirection(2, 2)).toBe(1);
    expect(moveDirection(2, 0)).toBe(-1);
  });
});
