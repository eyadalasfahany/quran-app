import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { locales } from '../../../../jest/render-ui';
import { renderGesture } from '../../../../jest/seerah-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { TimelineBar } from './TimelineBar';

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler')>('react-native-gesture-handler');
  return { ...actual, usePanGesture: jest.fn(actual.usePanGesture) };
});
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

type CardPan = { activeOffsetY?: unknown; onDeactivate: (event: { translationY: number; velocityY: number }) => void };
// The card's collapse pan: the one with a vertical activation offset (the scrubber's starts at once).
function cardPan(): CardPan {
  const config = jest.mocked(usePanGesture).mock.calls.map((call) => call[0] as unknown as CardPan).findLast((item) => item.activeOffsetY !== undefined);
  if (config === undefined) {
    throw new Error('no collapse pan');
  }
  return config;
}

let mockGlass = false;
jest.mock('@/core/theme', () => ({ ...jest.requireActual<object>('@/core/theme'), useGlass: () => mockGlass }));

const counts = Array.from({ length: 64 }, (_, age) => (age === 55 ? 8 : age === 54 ? 1 : 0));
const milestones = [
  { age: 0, eventId: 'e1', key: 'birth', labelAr: 'المولد' },
  { age: 53, eventId: 'e2', key: 'hijra', labelAr: 'الهجرة' },
];
const base = { counts, milestones, totalCount: 162, unspecifiedCount: 12 };
const hidden = { includeHiddenElements: true } as const;

function bar(props: Partial<React.ComponentProps<typeof TimelineBar>> = {}, locale: (typeof locales)[number] = 'ar') {
  const onFocusChange = jest.fn();
  const view = renderGesture(<TimelineBar {...base} focus={null} onFocusChange={onFocusChange} {...props} />, { locale });
  return { onFocusChange, view };
}

beforeEach(() => {
  I18nManager.isRTL = true;
});

describe('TimelineBar', () => {
  it.each(locales)('shows «all ages» with the event total and the hint when nothing is selected (%s)', async (locale) => {
    await bar({}, locale).view;
    expect(screen.getByText(locale === 'ar' ? 'كل الأعمار' : 'All ages')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? '١٦٢ حدثًا · اسحب لاختيار عمر' : '162 events · drag to choose an age')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: locale === 'ar' ? 'الكل' : 'All' })).toBeNull();
  });

  it('shows the selected age, its stage and its event count', async () => {
    await bar({ focus: 55 }).view;
    expect(screen.getByText('عمره ٥٥ سنة')).toBeOnTheScreen();
    expect(screen.getByText('الكهولة · ٨ أحداث')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الكل' })).toBeOnTheScreen();
  });

  it('names the milestone of the selected age (frame SeerahMapRegionYear)', async () => {
    await bar({ focus: 53 }).view;
    expect(screen.getByText('عمره ٥٣ سنة')).toBeOnTheScreen();
    expect(screen.getByText('الكهولة · الهجرة · لا أحداث', { exact: false })).toBeOnTheScreen();
  });

  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['sepia', 'light'],
  ] as const)('draws its glass in the app theme, not the system one (%s)', async (theme, scheme) => {
    mockGlass = true;
    try {
      await renderGesture(<TimelineBar {...base} focus={null} onFocusChange={jest.fn()} />, { theme });
      expect(screen.getByTestId('timeline-bar-glass', hidden).props.colorScheme).toBe(scheme);
    } finally {
      mockGlass = false;
    }
  });

  it('shows the unspecified bucket in its own words', async () => {
    await bar({ focus: 'unspecified' }).view;
    expect(screen.getByText('عمر غير محدد')).toBeOnTheScreen();
    expect(screen.getByText('١٢ حدثًا لم يذكر الكتاب وقتها')).toBeOnTheScreen();
  });

  it('«الكل» clears the selection', async () => {
    const { onFocusChange, view } = bar({ focus: 55 });
    await view;
    await press(screen.getByRole('button', { name: 'الكل' }));
    expect(onFocusChange).toHaveBeenCalledWith(null);
  });

  it('the arrows step one year', async () => {
    const { onFocusChange, view } = bar({ focus: 55 });
    await view;
    await press(screen.getByRole('button', { name: 'العمر التالي' }));
    expect(onFocusChange).toHaveBeenLastCalledWith(56);
    await press(screen.getByRole('button', { name: 'العمر السابق' }));
    expect(onFocusChange).toHaveBeenLastCalledWith(54);
  });

  it('the first step from «all» lands on age 0 (next) or 63 (previous)', async () => {
    const { onFocusChange, view } = bar();
    await view;
    await press(screen.getByRole('button', { name: 'العمر التالي' }));
    expect(onFocusChange).toHaveBeenLastCalledWith(0);
    await press(screen.getByRole('button', { name: 'العمر السابق' }));
    expect(onFocusChange).toHaveBeenLastCalledWith(63);
  });

  it('the «غير محدد» chip toggles the bucket', async () => {
    const { onFocusChange, view } = bar();
    await view;
    await press(screen.getByRole('button', { name: 'غير محدد، ١٢ حدثًا' }));
    expect(onFocusChange).toHaveBeenLastCalledWith('unspecified');
  });

  it('pressing the chip again clears it', async () => {
    const { onFocusChange, view } = bar({ focus: 'unspecified' });
    await view;
    const chip = screen.getByRole('button', { name: 'غير محدد، ١٢ حدثًا' });
    expect(chip.props.accessibilityState).toEqual({ selected: true });
    await press(chip);
    expect(onFocusChange).toHaveBeenLastCalledWith(null);
  });

  it('is adjustable and announces the year through its value', async () => {
    await bar({ focus: 55 }).view;
    expect(screen.getByRole('adjustable').props.accessibilityValue.text).toBe('عمره ٥٥ سنة، ٨ أحداث');
  });

  it('adjustable increment changes the year', async () => {
    const { onFocusChange, view } = bar({ focus: 55 });
    await view;
    await act(async () => {
      fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(onFocusChange).toHaveBeenLastCalledWith(56);
  });

  it('labels the milestones from the catalog in English and falls back to the book label', async () => {
    const english = await bar({}, 'en').view;
    expect(screen.getByText('Birth', hidden)).toBeOnTheScreen();
    await english.unmount();
    await bar({ milestones: [{ age: 40, eventId: 'e', key: 'custom', labelAr: 'علامة' }] }).view;
    expect(screen.getByText('علامة', hidden)).toBeOnTheScreen();
  });

  it('draws the vertical bar with the same controls', async () => {
    await bar({ orientation: 'vertical', focus: 10 }).view;
    expect(screen.getByRole('adjustable')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'العمر السابق' })).toBeOnTheScreen();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/TimelineBar.tsx')).toEqual([]);
  });

  describe('hiding, like the mini player', () => {
    afterEach(async () => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    });

    it('without onCollapse draws no hint, no drag strip and no hide action', async () => {
      await bar().view;
      expect(screen.queryByTestId('mini-player-chevron', hidden)).toBeNull();
      expect(screen.queryByTestId('timeline-bar-drag-strip')).toBeNull();
      expect(screen.getByRole('header').props.accessibilityActions).toBeUndefined();
    });

    it.each(locales)('draws the ⌄ hint and gives the title the hide action (%s)', async (locale) => {
      await bar({ onCollapse: jest.fn() }, locale).view;
      expect(screen.getByTestId('mini-player-chevron', hidden).props.pointerEvents).toBe('none');
      expect(screen.getByRole('header').props.accessibilityActions).toEqual([
        { label: locale === 'ar' ? 'إخفاء الخط الزمني' : 'Hide timeline', name: 'collapse' },
      ]);
    });

    it('a short drag on the title row springs back; the scrubber keeps its own drag', async () => {
      const onCollapse = jest.fn();
      await bar({ onCollapse }).view;
      expect(screen.getByTestId('timeline-bar-drag-strip')).toContainElement(screen.getByTestId('timeline-bar-header'));
      expect(screen.getByTestId('timeline-bar-drag-strip')).not.toContainElement(screen.getByRole('adjustable'));
      await act(async () => cardPan().onDeactivate({ translationY: 20, velocityY: 0 }));
      expect(onCollapse).not.toHaveBeenCalled();
    });

    it('Reduce Motion: the hide action swaps at once, with no slide', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const onCollapse = jest.fn();
      await bar({ onCollapse }).view;
      await act(async () => {
        fireEvent(screen.getByRole('header'), 'accessibilityAction', { nativeEvent: { actionName: 'collapse' } });
      });
      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    // Last: the collapse runs a spring whose callback outlives the test.
    it('a drag down past half the card hides it once the card has slid away', async () => {
      const onCollapse = jest.fn();
      await bar({ onCollapse }).view;
      await act(async () => cardPan().onDeactivate({ translationY: 80, velocityY: 0 }));
      await waitFor(() => expect(onCollapse).toHaveBeenCalledTimes(1));
    });
  });
});
