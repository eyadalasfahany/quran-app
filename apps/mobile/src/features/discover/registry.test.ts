import ar from '@/core/i18n/locales/ar.json';
import en from '@/core/i18n/locales/en.json';

import { DISCOVER_ENTRIES, DISCOVER_GROUPS, DISCOVER_IDS, isDiscoverId, tourKeyFor } from './registry';

function lookup(tree: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[part] : undefined), tree);
}

describe('discover registry', () => {
  it('lists the 13 rows once each, in the registry order of the ids', () => {
    expect(DISCOVER_ENTRIES).toHaveLength(13);
    expect(DISCOVER_ENTRIES.map((entry) => entry.id)).toEqual([...DISCOVER_IDS]);
    expect(new Set(DISCOVER_IDS).size).toBe(DISCOVER_IDS.length);
  });

  it('uses only the five groups', () => {
    for (const entry of DISCOVER_ENTRIES) {
      expect(DISCOVER_GROUPS).toContain(entry.group);
    }
  });

  it('records each row with a semantic version string', () => {
    for (const entry of DISCOVER_ENTRIES) {
      expect(entry.since).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it.each([ar, en])('has a title and a tour line in every locale for each row', (locale) => {
    for (const entry of DISCOVER_ENTRIES) {
      expect(typeof lookup(locale as Record<string, unknown>, entry.titleKey)).toBe('string');
      expect(typeof lookup(locale as Record<string, unknown>, tourKeyFor(entry))).toBe('string');
    }
  });

  it('opens the reading steps on the Quran screen, each mode in its own mode', () => {
    const open = (id: string) => DISCOVER_ENTRIES.find((entry) => entry.id === id)?.open;
    expect(open('reader.mushaf')).toEqual({ kind: 'reader', mode: 'mushaf' });
    expect(open('reader.reading')).toEqual({ kind: 'reader', mode: 'reading' });
    expect(open('reader.focus')).toEqual({ kind: 'reader', mode: 'focus' });
    expect(open('reader.tafsir')).toEqual({ kind: 'reader', mode: null });
  });

  it('completes the steps that are only shown with «التالي», and the rest by their action', () => {
    const show = DISCOVER_ENTRIES.filter((entry) => entry.step === 'show').map((entry) => entry.id);
    expect(show).toEqual(['reader.mushaf', 'reader.reading', 'reader.focus', 'my-quran', 'worship.salah', 'app.settings', 'app.widget']);
  });

  it('keeps the widget row optional on the app group', () => {
    const widget = DISCOVER_ENTRIES.find((entry) => entry.id === 'app.widget');
    expect(widget?.open).toEqual({ kind: 'widget-sheet' });
    expect(widget?.group).toBe('app');
  });

  it('recognises only registry ids', () => {
    expect(isDiscoverId('reader.focus')).toBe(true);
    expect(isDiscoverId('removed.row')).toBe(false);
  });
});
