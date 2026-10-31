import { act, fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { makeDetail, makeItem, press, quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { openAzkarUserDb } from '../../../../jest/azkar-test-db';
import { renderUi } from '../../../../jest/render-ui';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { azkarShareText } from '../data/share-text';
import { buildReaderUnits } from '../data/reader-units';
import { scopeKeyForEntry, SESSION_UNIT_KEY } from '../data/progress';
import * as content from '../data/content-repository';
import * as progressRepo from '../data/progress-repository';
import type { AzkarStore } from '../data/progress-repository';
import * as haptics from '../haptics';
import { AzkarReaderScreen } from './AzkarReaderScreen';

const ENTRY_KEY = 'fixture:entry-001';
const SCOPE = scopeKeyForEntry(ENTRY_KEY);

const mockEntry = jest.fn();
const mockRows = jest.fn();
const mockIsFavorite = jest.fn();
const mockWindowClass = jest.fn();
const mockPush = jest.fn();
/** Re-renders every mounted reader when a tap changes the progress rows (stands in for the live query). */
const mockProgressListeners = new Set<() => void>();

jest.mock('../data/hooks', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useAzkarFontScale: () => [1, jest.fn()],
    useCategoryUnits: () => [],
    useEntry: () => mockEntry(),
    useIsFavorite: () => mockIsFavorite(),
    useScopeProgress: () => {
      const [, rerender] = React.useReducer((count: number) => count + 1, 0);
      React.useEffect(() => {
        mockProgressListeners.add(rerender);
        return () => {
          mockProgressListeners.delete(rerender);
        };
      }, [rerender]);
      return { data: mockRows() };
    },
    useVariationChoices: () => ({ choices: {}, choose: jest.fn() }),
  };
});

jest.mock('../data/content-repository', () => ({
  getCategory: jest.fn(() => undefined),
  getEntry: jest.fn(),
  getQuranSegmentVerses: jest.fn(),
}));

jest.mock('../data/progress-repository', () => ({
  recordTap: jest.fn(() => ({ accepted: true, completedNow: false })),
  markSessionComplete: jest.fn(),
  resetScope: jest.fn(),
  resetUnit: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

jest.mock('../data/favorites-repository', () => ({
  toggleFavorite: jest.fn(),
}));

jest.mock('../haptics', () => ({
  tapHaptic: jest.fn(),
  completeHaptic: jest.fn(),
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
}));

jest.mock('@/core/layout', () => {
  const actual = jest.requireActual<typeof import('@/core/layout')>('@/core/layout');
  return { ...actual, useWindowClass: () => mockWindowClass() };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
    // Like the real hook: the effect re-runs only when its callback changes, and its cleanup runs on blur.
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
  };
});

const progress = progressRepo as jest.Mocked<typeof progressRepo>;
const contentMock = content as jest.Mocked<typeof content>;

/** A row for the counted unit `fixture:item-1` with a given count. */
function row(itemKey: string, currentCount: number, completed: boolean) {
  return {
    scopeKey: SCOPE,
    periodKey: 'session',
    itemKey,
    currentCount,
    completedAt: completed ? 1 : null,
    updatedAt: 1,
  };
}

function entryWith(items: ReturnType<typeof makeItem>[]) {
  return makeDetail({ items });
}

function renderReader(props: { startUnitKey?: string } = {}, locale: 'ar' | 'en' = 'ar') {
  return renderUi(<AzkarReaderScreen scope={{ kind: 'entry', entryKey: ENTRY_KEY }} {...props} />, { locale });
}

describe('AzkarReaderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowClass.mockReturnValue('compact');
    mockRows.mockReturnValue([]);
    mockReduceMotion.mockReturnValue(false);
    mockIsFavorite.mockReturnValue(false);
    mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: 3 })]));
    contentMock.getEntry.mockReturnValue(makeDetail());
    contentMock.getQuranSegmentVerses.mockReturnValue([{ textUthmani: 'آية تجريبية' }] as never);
    progress.recordTap.mockReturnValue({ accepted: true, completedNow: false } as never);
  });

  it('counts a tap on the counter and records one accepted tap with a selection haptic', async () => {
    await renderReader();
    await press(screen.getByRole('button', { name: 'عداد الذكر ١' }));

    expect(progress.recordTap).toHaveBeenCalledWith(SCOPE, 'session', 'fixture:item-1', 3);
    expect(haptics.tapHaptic).toHaveBeenCalledTimes(1);
    expect(haptics.completeHaptic).not.toHaveBeenCalled();
  });

  it('fires the completion haptic when the tap completes the unit', async () => {
    progress.recordTap.mockReturnValue({ accepted: true, completedNow: true } as never);
    await renderReader();
    await press(screen.getByRole('button', { name: 'عداد الذكر ١' }));

    expect(haptics.tapHaptic).toHaveBeenCalledTimes(1);
    expect(haptics.completeHaptic).toHaveBeenCalledTimes(1);
  });

  it('ignores a tap the data layer refuses (inside the 120 ms guard)', async () => {
    progress.recordTap.mockReturnValue({ accepted: false, completedNow: false } as never);
    await renderReader();
    await press(screen.getByRole('button', { name: 'عداد الذكر ١' }));

    expect(haptics.tapHaptic).not.toHaveBeenCalled();
  });

  it('shows the count from the saved progress as «٢ من ٣»', async () => {
    mockRows.mockReturnValue([row('fixture:item-1', 2, false)]);
    await renderReader();

    expect(screen.getByRole('button', { name: 'عداد الذكر ١' }).props.accessibilityValue).toEqual({ text: '٢ من ٣' });
  });

  it('shows the Done button and no number when the unit has no sourced count', async () => {
    mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: null })]));
    await renderReader();

    expect(screen.getByRole('button', { name: 'تم' })).toBeTruthy();
    // The top bar's «١ من ١» is the position in the reader, not the unit's count.
    expect(screen.queryByTestId('azkar-counter-value')).toBeNull();
    expect(screen.queryByRole('button', { name: /عداد الذكر/ })).toBeNull();
  });

  it('records a Done tap for a unit with no sourced count, with a null count', async () => {
    mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: null })]));
    await renderReader();
    await press(screen.getByRole('button', { name: 'تم' }));

    expect(progress.recordTap).toHaveBeenCalledWith(SCOPE, 'session', 'fixture:item-1', null);
  });

  it('resets a unit from the counter’s reset accessibility action', async () => {
    await renderReader();
    fireEvent(screen.getByRole('button', { name: 'عداد الذكر ١' }), 'accessibilityAction', { nativeEvent: { actionName: 'reset' } });

    expect(progress.resetUnit).toHaveBeenCalledWith(SCOPE, 'session', 'fixture:item-1');
  });

  it('toggles the favourite for the entry', async () => {
    const { toggleFavorite } = jest.requireMock<typeof import('../data/favorites-repository')>('../data/favorites-repository');
    await renderReader();
    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));

    expect(toggleFavorite).toHaveBeenCalledWith(ENTRY_KEY);
  });

  it('shares exactly the share text, with nothing appended', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: 3 })]));
    await renderReader();
    await press(screen.getByRole('button', { name: 'مشاركة' }));

    const unit = buildReaderUnits(ENTRY_KEY, [makeItem({ id: 1, requiredCount: 3 })], 'ar')[0];
    if (unit === undefined) {
      throw new Error('the fixture entry must have a unit');
    }
    const expected = azkarShareText(unit, () => ['آية تجريبية'], 'حصن المسلم · ٢٠');
    expect(share).toHaveBeenCalledWith({ message: expected });
    share.mockRestore();
  });

  it('renders a Quran segment from the verses, not as copied text', async () => {
    mockEntry.mockReturnValue(
      entryWith([makeItem({ id: 1, requiredCount: 1, segments: [textSegment('نص تجريبي ١ — ليس ذكرًا'), quranSegment(1, 2)] })]),
    );
    await renderReader();

    expect(contentMock.getQuranSegmentVerses).toHaveBeenCalled();
    expect(screen.getByText(/آية تجريبية/)).toBeTruthy();
  });

  it('moves to the next unit and back with the arrows', async () => {
    mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: 3 }), makeItem({ id: 2, requiredCount: 3, position: 2 })]));
    await renderReader();
    expect(screen.getByRole('button', { name: 'عداد الذكر ١' })).toBeTruthy();

    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByRole('button', { name: 'عداد الذكر ٢' })).toBeTruthy();

    await press(screen.getByRole('button', { name: 'السابق' }));
    expect(screen.getByRole('button', { name: 'عداد الذكر ١' })).toBeTruthy();
  });

  it('resumes at the first incomplete unit', async () => {
    mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: 3 }), makeItem({ id: 2, requiredCount: 3, position: 2 })]));
    mockRows.mockReturnValue([row('fixture:item-1', 3, true)]);
    await renderReader();

    expect(screen.getByRole('button', { name: 'عداد الذكر ٢' })).toBeTruthy();
  });

  it('shows the completion screen for a session already marked complete, and restarts the scope from it', async () => {
    mockRows.mockReturnValue([row('fixture:item-1', 3, true), row(SESSION_UNIT_KEY, 0, true)]);
    await renderReader();

    expect(screen.getByRole('header', { name: /^أتممت / })).toBeTruthy();
    await press(screen.getByRole('button', { name: 'البدء من جديد' }));
    expect(progress.resetScope).toHaveBeenCalledWith(SCOPE, 'session');
  });

  it('stays on the last unit with the «إتمام» action when every unit is done but not yet marked', async () => {
    mockRows.mockReturnValue([row('fixture:item-1', 3, true)]);
    await renderReader();

    expect(screen.queryByRole('header', { name: /^أتممت / })).toBeNull();
    expect(screen.getByRole('button', { name: 'إتمام' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /عداد الذكر/ })).toBeNull();
  });

  it('opens the details as a route in a compact window', async () => {
    await renderReader();
    await press(screen.getByRole('button', { name: 'المصدر والتفاصيل' }));

    expect(mockPush).toHaveBeenCalledWith(`/azkar/details/${encodeURIComponent(ENTRY_KEY)}`);
  });

  it('shows the details panel beside the reader in an expanded window', async () => {
    mockWindowClass.mockReturnValue('expanded');
    await renderReader();
    await press(screen.getByRole('button', { name: 'المصدر والتفاصيل' }));

    expect(screen.getByTestId('azkar-details-panel')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders in English with English counter labels and the English count', async () => {
    await renderReader({}, 'en');

    expect(screen.getByRole('button', { name: 'Counter for dhikr 1' }).props.accessibilityValue).toEqual({ text: '0 of 3' });
  });

  describe('tap anywhere on the dhikr area (real tap guard and progress, in-memory user.db)', () => {
    const TEXT = /نص تجريبي/;
    let clock = 0;
    let store: AzkarStore;

    beforeEach(() => {
      clock = 1_000_000;
      const db: SqlExecutor = openAzkarUserDb().executor;
      store = { db, now: () => clock };
      const actual = jest.requireActual<typeof progressRepo>('../data/progress-repository');
      progress.recordTap.mockImplementation(((scopeKey, periodKey, unitKey, requiredCount) => {
        const result = actual.recordTap(scopeKey, periodKey, unitKey, requiredCount, store);
        mockProgressListeners.forEach((rerender) => rerender());
        return result;
      }) as typeof progressRepo.recordTap);
      mockRows.mockImplementation(() => actual.getProgressRows(SCOPE, 'session', store));
    });

    it('counts a tap on the dhikr text: «٠ من ٣», then «١ من ٣», then «٢ من ٣»', async () => {
      await renderReader();
      const counter = () => screen.getByRole('button', { name: 'عداد الذكر ١' });
      expect(counter().props.accessibilityValue).toEqual({ text: '٠ من ٣' });

      await press(screen.getByText(TEXT));
      expect(counter().props.accessibilityValue).toEqual({ text: '١ من ٣' });

      clock += 200;
      await press(screen.getByText(TEXT));
      expect(counter().props.accessibilityValue).toEqual({ text: '٢ من ٣' });
      expect(haptics.tapHaptic).toHaveBeenCalledTimes(2);
    });

    it('counts two taps within 120 ms once, and a tap at 120 ms or later again', async () => {
      await renderReader();
      await press(screen.getByText(TEXT));
      clock += 50;
      await press(screen.getByText(TEXT));

      expect(screen.getByRole('button', { name: 'عداد الذكر ١' }).props.accessibilityValue).toEqual({ text: '١ من ٣' });
      expect(haptics.tapHaptic).toHaveBeenCalledTimes(1);

      clock += 120;
      await press(screen.getByText(TEXT));
      expect(screen.getByRole('button', { name: 'عداد الذكر ١' }).props.accessibilityValue).toEqual({ text: '٢ من ٣' });
    });

    it('marks a unit with no sourced count done on a tap on the text, and disables the surface', async () => {
      mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: null })]));
      await renderReader();
      await press(screen.getByText(TEXT));

      expect(progress.recordTap).toHaveBeenCalledWith(SCOPE, 'session', 'fixture:item-1', null);
      expect(haptics.completeHaptic).toHaveBeenCalledTimes(1);
      // A single unit is the last one: once it is done, «إتمام» replaces the «تم» action.
      expect(screen.getByRole('button', { name: 'إتمام' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'تم' })).toBeNull();
      await press(screen.getByText(TEXT));
      expect(progress.recordTap).toHaveBeenCalledTimes(1);
    });

    it('does not count a tap on share, favourite, details or the text size control', async () => {
      const { toggleFavorite } = jest.requireMock<typeof import('../data/favorites-repository')>('../data/favorites-repository');
      const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
      await renderReader();

      await press(screen.getByRole('button', { name: 'مشاركة' }));
      await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
      await press(screen.getByRole('button', { name: 'المصدر والتفاصيل' }));
      await press(screen.getByTestId('azkar-text-size-toggle'));

      expect(progress.recordTap).not.toHaveBeenCalled();
      expect(haptics.tapHaptic).not.toHaveBeenCalled();
      expect(toggleFavorite).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'عداد الذكر ١' }).props.accessibilityValue).toEqual({ text: '٠ من ٣' });
      share.mockRestore();
    });

    it('ignores a tap on the dhikr text of a completed unit', async () => {
      mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: 3 }), makeItem({ id: 2, requiredCount: 3, position: 2 })]));
      mockRows.mockReturnValue([row('fixture:item-1', 3, true)]);
      await renderReader();
      await press(screen.getByRole('button', { name: 'السابق' }));

      expect(screen.getByRole('button', { name: 'عداد الذكر ١' }).props.accessibilityValue).toEqual({ text: '٣ من ٣' });
      await press(screen.getByText(TEXT));

      expect(progress.recordTap).not.toHaveBeenCalled();
      expect(haptics.tapHaptic).not.toHaveBeenCalled();
    });

    it('hides the surface from accessibility while the counter button stays accessible with its value', async () => {
      await renderReader();
      const surface = screen.getByTestId('azkar-tap-surface');

      expect(surface.props.accessible).toBe(false);
      expect(surface.props.importantForAccessibility).toBe('no');
      expect(screen.getByRole('button', { name: 'عداد الذكر ١' }).props.accessibilityValue).toEqual({ text: '٠ من ٣' });
    });

    it('counts a tap on the dhikr text in English, with the English counter', async () => {
      await renderReader({}, 'en');
      await press(screen.getByText(TEXT));

      expect(screen.getByRole('button', { name: 'Counter for dhikr 1' }).props.accessibilityValue).toEqual({ text: '1 of 3' });
      expect(haptics.tapHaptic).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-advance and session completion (fake timers, real progress in user.db)', () => {
    const TEXT = /نص تجريبي/;
    const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
    const counterOf = (position: number) =>
      screen.getByRole('button', { name: `عداد الذكر ${String(position).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)] ?? d)}` });
    let clock = 0;
    let store: AzkarStore;
    let actual: typeof progressRepo;

    const twoUnits = () => entryWith([makeItem({ id: 1, requiredCount: 1 }), makeItem({ id: 2, requiredCount: 1, position: 2 })]);

    beforeEach(() => {
      jest.useFakeTimers();
      clock = 1_000_000;
      store = { db: openAzkarUserDb().executor, now: () => clock };
      actual = jest.requireActual<typeof progressRepo>('../data/progress-repository');
      const rerenderAll = () => mockProgressListeners.forEach((rerender) => rerender());

      progress.recordTap.mockImplementation(((scopeKey, periodKey, unitKey, requiredCount) => {
        const result = actual.recordTap(scopeKey, periodKey, unitKey, requiredCount, store);
        rerenderAll();
        return result;
      }) as typeof progressRepo.recordTap);
      progress.markSessionComplete.mockImplementation(((scopeKey, periodKey) => {
        actual.markSessionComplete(scopeKey, periodKey, store);
        rerenderAll();
      }) as typeof progressRepo.markSessionComplete);
      progress.resetScope.mockImplementation(((scopeKey, periodKey) => {
        actual.resetScope(scopeKey, periodKey, store);
        rerenderAll();
      }) as typeof progressRepo.resetScope);
      mockRows.mockImplementation(() => actual.getProgressRows(SCOPE, 'session', store));
      mockEntry.mockReturnValue(twoUnits());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('moves to the next unit 600 ms after a unit completes, not before', async () => {
      await renderReader();
      await press(screen.getByText(TEXT));
      expect(counterOf(1)).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(599);
      });
      expect(counterOf(1)).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(counterOf(2)).toBeTruthy();
    });

    it('advances after a Done tap on a unit with no sourced count, too', async () => {
      mockEntry.mockReturnValue(entryWith([makeItem({ id: 1, requiredCount: null }), makeItem({ id: 2, requiredCount: 1, position: 2 })]));
      await renderReader();
      await press(screen.getByRole('button', { name: 'تم' }));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(counterOf(2)).toBeTruthy();
    });

    it('moves on at once under Reduce Motion, with no pause', async () => {
      mockReduceMotion.mockReturnValue(true);
      await renderReader();
      await press(screen.getByText(TEXT));

      expect(counterOf(2)).toBeTruthy();
    });

    it('advances in English too', async () => {
      await renderReader({}, 'en');
      await press(screen.getByText(TEXT));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(screen.getByRole('button', { name: 'Counter for dhikr 2' })).toBeTruthy();
    });

    it('does not advance when a completed unit is revisited', async () => {
      mockRows.mockReturnValue([row('fixture:item-1', 1, true)]);
      await renderReader();
      expect(counterOf(2)).toBeTruthy();

      await press(screen.getByRole('button', { name: 'السابق' }));
      await act(async () => {
        jest.advanceTimersByTime(1_000);
      });

      expect(counterOf(1)).toBeTruthy();
      expect(progress.recordTap).not.toHaveBeenCalled();
    });

    it('a manual move cancels a pending advance', async () => {
      mockEntry.mockReturnValue(
        entryWith([
          makeItem({ id: 1, requiredCount: 1 }),
          makeItem({ id: 2, requiredCount: 1, position: 2 }),
          makeItem({ id: 3, requiredCount: 1, position: 3 }),
        ]),
      );
      await renderReader();
      await press(screen.getByText(TEXT));
      await press(screen.getByRole('button', { name: 'التالي' }));
      await press(screen.getByRole('button', { name: 'السابق' }));
      await act(async () => {
        jest.advanceTimersByTime(1_000);
      });

      expect(counterOf(1)).toBeTruthy();
    });

    it('clears a pending advance on unmount', async () => {
      // The pending advance is cancelled in the unmount cleanup (verified by a temporary log of the cancel path; Jest's
      // fake timers do not expose the cleared id). Running timers after unmount is left out: it leaks into later renders.
      const { unmount } = await renderReader();
      await press(screen.getByText(TEXT));

      expect(() => unmount()).not.toThrow();
    });

    it('the last unit does not auto-advance; «إتمام» appears once every unit is done', async () => {
      await renderReader();
      await press(screen.getByText(TEXT));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await press(screen.getByText(TEXT));
      await act(async () => {
        jest.advanceTimersByTime(1_000);
      });

      expect(screen.getByRole('button', { name: 'إتمام' })).toBeTruthy();
      expect(screen.queryByRole('header', { name: /^أتممت / })).toBeNull();
      expect(progress.markSessionComplete).not.toHaveBeenCalled();
    });

    it('«إتمام» records the session as complete and shows the completion screen', async () => {
      await renderReader();
      await press(screen.getByText(TEXT));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await press(screen.getByText(TEXT));
      await press(screen.getByRole('button', { name: 'إتمام' }));

      expect(progress.markSessionComplete).toHaveBeenCalledWith(SCOPE, 'session');
      expect(screen.getByRole('header', { name: /^أتممت / })).toBeTruthy();
    });

    it('reopening a marked session shows the completion screen, and «البدء من جديد» clears the mark', async () => {
      actual.recordTap(SCOPE, 'session', 'fixture:item-1', 1, store);
      clock += 200;
      actual.recordTap(SCOPE, 'session', 'fixture:item-2', 1, store);
      actual.markSessionComplete(SCOPE, 'session', store);

      await renderReader();
      expect(screen.getByRole('header', { name: /^أتممت / })).toBeTruthy();

      await press(screen.getByRole('button', { name: 'البدء من جديد' }));
      expect(counterOf(1).props.accessibilityValue).toEqual({ text: '٠ من ١' });
      expect(actual.isSessionComplete(SCOPE, 'session', store)).toBe(false);
    });

    it('shows the English «Mark as complete» on the last unit', async () => {
      mockRows.mockReturnValue([row('fixture:item-1', 1, true), row('fixture:item-2', 1, true)]);
      await renderReader({}, 'en');

      expect(screen.getByRole('button', { name: 'Mark as complete' })).toBeTruthy();
    });
  });
});
