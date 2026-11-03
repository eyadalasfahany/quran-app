import { computeDiscoverProgress, DISCOVER_CARD_ROW_COUNT } from './progress';
import { DISCOVER_ENTRIES, type DiscoverId } from './registry';
import type { DiscoverState } from './store';

const ALL_IDS = DISCOVER_ENTRIES.map((entry) => entry.id);

function state(overrides: Partial<DiscoverState> = {}): DiscoverState {
  return { done: [], acknowledged: null, hidden: false, tourStep: null, ...overrides };
}

describe('computeDiscoverProgress', () => {
  it('shows the card in progress for a new person, with no badges', () => {
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state());
    expect(progress.mode).toBe('progress');
    expect(progress.total).toBe(13);
    expect(progress.doneCount).toBe(0);
    expect(progress.rows.some((row) => row.isNew)).toBe(false);
  });

  it('counts done rows and keeps the pending rows in registry order', () => {
    const done: DiscoverId[] = ['reader.mushaf', 'reader.reading', 'my-quran'];
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state({ done }));
    expect(progress.doneCount).toBe(3);
    expect(progress.pending.map((row) => row.entry.id).slice(0, DISCOVER_CARD_ROW_COUNT)).toEqual([
      'reader.focus',
      'reader.tafsir',
      'listen.follow',
    ]);
  });

  it('shows the done state when every row is complete and nothing is acknowledged yet', () => {
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state({ done: ALL_IDS }));
    expect(progress.mode).toBe('done');
    expect(progress.pending).toHaveLength(0);
  });

  it('hides the card once the set is acknowledged after completion', () => {
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state({ done: ALL_IDS, acknowledged: ALL_IDS }));
    expect(progress.mode).toBe('hidden');
  });

  it('keeps a hidden card hidden while no row is new', () => {
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state({ acknowledged: ALL_IDS, hidden: true }));
    expect(progress.mode).toBe('hidden');
  });

  it('brings a hidden card back with only the new row badged after an update adds one', () => {
    // The person hid the card before app.widget existed: everything else was acknowledged.
    const acknowledged = ALL_IDS.filter((id) => id !== 'app.widget');
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state({ acknowledged, hidden: true }));
    expect(progress.mode).toBe('progress');
    expect(progress.rows.filter((row) => row.isNew).map((row) => row.entry.id)).toEqual(['app.widget']);
  });

  it('badges only rows missing from the acknowledged set', () => {
    const acknowledged: DiscoverId[] = ALL_IDS.filter((id) => id !== 'reader.tafsir' && id !== 'app.widget');
    const progress = computeDiscoverProgress(DISCOVER_ENTRIES, state({ acknowledged, done: acknowledged }));
    expect(progress.rows.filter((row) => row.isNew).map((row) => row.entry.id)).toEqual(['reader.tafsir', 'app.widget']);
  });
});
