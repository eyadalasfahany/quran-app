import { screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithListSkeleton } from './HadithListSkeleton';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;
const TEST_ID = 'hadith-list-skeleton';

describe('HadithListSkeleton', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithListSkeleton />, { locale });
    expect(screen.getByTestId(`${TEST_ID}-row-0`)).toBeOnTheScreen();
  });

  it('draws six rows by default and the given number otherwise', async () => {
    const first = await renderUi(<HadithListSkeleton />);
    expect(screen.getAllByTestId(/hadith-list-skeleton-row-\d+/)).toHaveLength(6);
    await first.unmount();

    await renderUi(<HadithListSkeleton rows={3} />);
    expect(screen.getAllByTestId(/hadith-list-skeleton-row-\d+/)).toHaveLength(3);
  });

  it('has the loading label', async () => {
    await renderUi(<HadithListSkeleton />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
  });

  it('each row is 56 by 75 plus two bars', async () => {
    await renderUi(<HadithListSkeleton rows={2} />);
    const cover = flatStyle(screen.getByTestId(`${TEST_ID}-cover-0`, { includeHiddenElements: true }).props.style);
    expect(cover).toMatchObject({ width: 56, height: 75 });
    expect(screen.getAllByTestId(/hadith-list-skeleton-title-\d+/, { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByTestId(/hadith-list-skeleton-count-\d+/, { includeHiddenElements: true })).toHaveLength(2);
  });

  it('holds the bars still with Reduce Motion on', async () => {
    mockReduce.mockReturnValue(true);
    await renderUi(<HadithListSkeleton rows={2} />);
    const bars = screen.getAllByTestId(/hadith-list-skeleton-(cover|title|count)-\d+/, { includeHiddenElements: true });
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(flatStyle(bar.props.style).opacity).toBe(1);
    }
  });

  it('keeps the group label with Reduce Motion on', async () => {
    mockReduce.mockReturnValue(true);
    await renderUi(<HadithListSkeleton rows={2} />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithListSkeleton />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithListSkeleton />, { theme });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-row-0`).props.style).borderBottomColor).toBe(themes[theme].colors.line);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithListSkeleton.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithListSkeleton rows={1} />);
    expect(maxFontScale.content).toBe(2);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-row-0`).props.style)).not.toHaveProperty('height');
  });
});
