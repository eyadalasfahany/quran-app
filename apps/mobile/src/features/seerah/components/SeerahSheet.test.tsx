import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { SeerahSheet } from './SeerahSheet';
import { SpotSheet } from './SpotSheet';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 47 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useIsFocused: jest.fn(() => true),
}));

const hidden = { includeHiddenElements: true } as const;

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
}

describe('SeerahSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(locales)('shows its content in the shared sheet host, with the frame card and grabber (%s)', async (locale) => {
    await renderUi(
      <SeerahSheet onClose={jest.fn()} visible>
        <Text>content</Text>
      </SeerahSheet>,
      { locale },
    );
    expect(screen.getByText('content')).toBeOnTheScreen();
    // The reader's SheetHost: its backdrop and its draggable card.
    expect(screen.getByTestId('sheet-backdrop')).toBeTruthy();
    expect(screen.getByTestId('seerah-sheet')).toBeTruthy();
    expect(flatStyle(screen.getByTestId('seerah-sheet-card').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      borderTopLeftRadius: 28,
    });
    expect(flatStyle(screen.getByTestId('seerah-sheet-grabber', hidden).props.style)).toMatchObject({ height: 5, width: 36 });
  });

  it('renders nothing when hidden', async () => {
    await renderUi(
      <SeerahSheet onClose={jest.fn()} visible={false}>
        <Text>content</Text>
      </SeerahSheet>,
    );
    expect(screen.queryByText('content')).toBeNull();
  });

  it('slides away on a scrim tap, then reports that it closed', async () => {
    const onClose = jest.fn();
    await renderUi(
      <SeerahSheet onClose={onClose} visible>
        <Text>content</Text>
      </SeerahSheet>,
    );
    await settle();
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a spot sheet inside closes through the host (slides down) and lists every row in a sheet scroll view', async () => {
    const onClose = jest.fn();
    const rows = Array.from({ length: 43 }, (_, index) => ({ id: `e${index}`, subtitle: 'عمره ٣٥ سنة', title: `عنوان ${index}` }));
    await renderUi(
      <SeerahSheet onClose={onClose} visible>
        <SpotSheet eventsLabel="٤٣ حدثًا" onClose={jest.fn()} onRowPress={jest.fn()} rows={rows} title="أخرى" />
      </SeerahSheet>,
    );
    await settle();
    // All 43 rows are in the scrollable list: the last one is reachable.
    expect(screen.getByRole('button', { name: 'عنوان 42, عمره ٣٥ سنة' })).toBeTruthy();
    expect(screen.getByTestId('seerah-spot-sheet-scroll')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'إغلاق' }));
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahSheet.tsx')).toEqual([]);
  });
});
