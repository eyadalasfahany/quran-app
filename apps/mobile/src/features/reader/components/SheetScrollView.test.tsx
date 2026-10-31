import { useMemo, type ReactNode } from 'react';
import { Text } from 'react-native';
import { GestureHandlerRootView, usePanGesture, type PanGesture } from 'react-native-gesture-handler';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import type { Detent } from '../form-sheet';
import { SheetScrollView } from './SheetScrollView';
import { SheetContext, type SheetContextValue } from './sheet-context';

/**
 * Provides a sheet context at the given detent, with a real pan gesture so the scroll view's native
 * gesture can be related to it.
 */
function InSheet({ detent, children }: { detent: Detent; children: ReactNode }) {
  const panGesture: PanGesture = usePanGesture({});
  const scrollOffset: SharedValue<number> = useSharedValue(0);
  const scrollTouched: SharedValue<boolean> = useSharedValue(false);
  const value = useMemo<SheetContextValue>(
    () => ({
      close: jest.fn(),
      collapse: jest.fn(),
      detent,
      expand: jest.fn(),
      panGesture,
      scrollOffset,
      scrollTouched,
    }),
    [detent, panGesture, scrollOffset, scrollTouched],
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
    </GestureHandlerRootView>
  );
}

describe('SheetScrollView', () => {
  it.each(locales)('is a plain scroll view outside a sheet, in %s', async (locale) => {
    const view = await renderUi(
      <SheetScrollView testID="scroll">
        <Text>الآية</Text>
      </SheetScrollView>,
      { locale },
    );

    expect(view.getByTestId('scroll').props.scrollEnabled).toBeUndefined();
    expect(view.getByTestId('scroll').props.showsVerticalScrollIndicator).toBe(false);
    expect(view.getByText('الآية')).toBeOnTheScreen();
  });

  it('passes scroll view props through outside a sheet', async () => {
    const view = await renderUi(
      <SheetScrollView scrollEnabled={false} testID="scroll">
        <Text>content</Text>
      </SheetScrollView>,
      { locale: 'en' },
    );

    expect(view.getByTestId('scroll').props.scrollEnabled).toBe(false);
  });

  it.each(locales)('locks scrolling at mid, in %s', async (locale) => {
    const view = await renderUi(
      <InSheet detent="mid">
        <SheetScrollView testID="scroll">
          <Text>التفسير</Text>
        </SheetScrollView>
      </InSheet>,
      { locale },
    );

    expect(view.getByTestId('scroll').props.scrollEnabled).toBe(false);
    expect(view.getByTestId('scroll').props.bounces).toBe(false);
    expect(view.getByText('التفسير')).toBeOnTheScreen();
  });

  it.each(locales)('scrolls at full, in %s', async (locale) => {
    const view = await renderUi(
      <InSheet detent="full">
        <SheetScrollView testID="scroll">
          <Text>التفسير</Text>
        </SheetScrollView>
      </InSheet>,
      { locale },
    );

    expect(view.getByTestId('scroll').props.scrollEnabled).toBe(true);
    // At the top a downward drag moves the sheet, so the content never overscrolls.
    expect(view.getByTestId('scroll').props.bounces).toBe(false);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetScrollView.tsx')).toEqual([]);
  });
});
