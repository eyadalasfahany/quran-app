import { useMemo, type ReactNode } from 'react';
import { fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView, usePanGesture, type PanGesture } from 'react-native-gesture-handler';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { locales, renderUi } from '../../../../jest/render-ui';
import { SheetContainer } from './SheetContainer';
import { SheetContext, type SheetContextValue } from './sheet-context';

/** A mid-detent sheet around the content, with a real pan gesture and the given expand. */
function InSheet({ expand, children }: { expand: () => void; children: ReactNode }) {
  const panGesture: PanGesture = usePanGesture({});
  const scrollOffset: SharedValue<number> = useSharedValue(0);
  const scrollTouched: SharedValue<boolean> = useSharedValue(false);
  const value = useMemo<SheetContextValue>(
    () => ({ close: jest.fn(), collapse: jest.fn(), detent: 'mid', expand, panGesture, scrollOffset, scrollTouched }),
    [expand, panGesture, scrollOffset, scrollTouched],
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
    </GestureHandlerRootView>
  );
}

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

describe('SheetContainer', () => {
  let executor: SqlExecutor;

  beforeAll(async () => {
    executor = (await openReaderTestContent()).executor;
  });

  it.each(locales)('falls back to the verse key without content in %s', async (locale) => {
    const view = await renderUi(<SheetContainer tab="actions" verseKey="2:255" />, { locale });
    expect(view.getByText('2:255')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-container').props.accessibilityLabel).toBe(locale === 'ar' ? 'خيارات الآية' : 'Ayah actions');
  });
  it('opens on the requested tab and switches tabs', async () => {
    const view = await renderUi(<SheetContainer executor={executor} tab="tafsir" verseKey="1:2" />, { locale: 'en' });

    expect(view.getByText('No tafsir downloaded')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('tab', { name: 'Options' }));
    expect(view.queryByText('No tafsir downloaded')).toBeNull();
    expect(view.getByRole('tab', { name: 'Options' }).props.accessibilityState).toEqual({ selected: true });
  });

  it('reports tab changes and takes the full sheet away from the actions tab', async () => {
    const onTabChange = jest.fn();
    const view = await renderUi(
      <SheetContainer executor={executor} onTabChange={onTabChange} tab="actions" verseKey="1:2" />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('tab', { name: 'Tafsir' }));

    expect(onTabChange).toHaveBeenCalledWith('tafsir');
  });

  it('lifts the sheet to full height when the tafsir opens', async () => {
    const expand = jest.fn();
    const view = await renderUi(
      <InSheet expand={expand}>
        <SheetContainer executor={executor} tab="actions" verseKey="1:2" />
      </InSheet>,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Tafsir' }));
    expect(expand).toHaveBeenCalledTimes(1);
    expect(view.getByText('No tafsir downloaded')).toBeOnTheScreen();

    await fireEvent.press(view.getByRole('tab', { name: 'Options' }));
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('moves to the next ayah inside the sheet', async () => {
    const view = await renderUi(<SheetContainer executor={executor} tab="tafsir" verseKey="1:2" />, { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Next ayah' }));

    // The phone sheet on the tafsir tab titles itself Tafsir and names the ayah beneath.
    expect(view.getByRole('header', { name: 'Tafsir' })).toBeOnTheScreen();
    expect(view.getByText('Al-Faatiha · Ayah 3')).toBeOnTheScreen();
  });

  it('closes from the header', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<SheetContainer executor={executor} onClose={onClose} tab="actions" verseKey="1:2" />, {
      locale: 'en',
    });

    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetContainer.tsx')).toEqual([]);
  });
});
