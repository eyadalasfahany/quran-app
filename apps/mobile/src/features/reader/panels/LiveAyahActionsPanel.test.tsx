import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { LiveAyahActionsPanel } from './LiveAyahActionsPanel';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

const mockHighlightArgs: unknown[] = [];

jest.mock('@/features/library/data', () => {
  const actual = jest.requireActual<typeof import('@/features/library/data')>('@/features/library/data');
  return {
    ...actual,
    useBookmarks: () => ({
      data: [
        { clientUpdatedAt: 1, id: 'b1', kind: 'verse', page: null, verseId: 2 },
        { clientUpdatedAt: 1, id: 'b2', kind: 'page', page: 1, verseId: 3 },
      ],
    }),
    useHighlights: (verseIds: readonly number[]) => {
      mockHighlightArgs.push(verseIds);
      return { data: verseIds.includes(2) ? [{ clientUpdatedAt: 1, color: 'gold', id: 'h1', verseId: 2 }] : [] };
    },
    useNotes: () => ({ data: [] }),
  };
});

function panel(verseId: number) {
  return (
    <LiveAyahActionsPanel
      reference="الفاتحة · الآية ٢"
      textUthmani="ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ"
      verseId={verseId}
      verseNumber={2}
      words={[]}
    />
  );
}

describe('LiveAyahActionsPanel', () => {
  it.each(locales)('shows the live bookmark and highlight for the ayah in %s', async (locale) => {
    const view = await renderUi(panel(2), { locale });
    const bookmarked = locale === 'ar' ? 'محفوظة' : 'Bookmarked';
    const gold = locale === 'ar' ? 'تظليل ذهبي' : 'Gold highlight';

    expect(view.getByRole('button', { name: bookmarked }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('button', { name: gold }).props.accessibilityState).toEqual({ selected: true });
    expect(mockHighlightArgs.at(-1)).toEqual([2]);
  });

  it('ignores page bookmarks and other ayahs', async () => {
    const view = await renderUi(panel(3), { locale: 'en' });

    expect(view.getByRole('button', { name: 'Bookmark' }).props.accessibilityState).toMatchObject({ selected: false });
    expect(view.getByRole('button', { name: 'Gold highlight' }).props.accessibilityState).toEqual({ selected: false });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/LiveAyahActionsPanel.tsx')).toEqual([]);
  });
});
