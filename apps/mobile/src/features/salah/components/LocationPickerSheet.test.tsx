import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { LocationPickerSheet, resultsMaxHeight } from './LocationPickerSheet';

const INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

function sheet(props: Partial<ComponentProps<typeof LocationPickerSheet>> = {}) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: INSETS }}>
      <LocationPickerSheet {...BASE} {...props} />
    </SafeAreaProvider>
  );
}

const BASE = {
  visible: true,
  source: 'auto' as const,
  onClose: () => undefined,
  onSelectAuto: () => undefined,
  onSelectCity: () => undefined,
};

// The decorative icons (the selected check) are hidden from accessibility; the rows carry the state.
const HIDDEN = { includeHiddenElements: true } as const;

describe('LocationPickerSheet', () => {
  it.each(locales)('renders the auto row and the search field when visible (%s)', async (locale) => {
    const view = await renderUi(sheet(), { locale });

    expect(view.getByTestId('salah-location-sheet-auto')).toBeTruthy();
    expect(view.getByTestId('salah-location-sheet-search')).toBeTruthy();
    expect(view.getByTestId('salah-location-sheet-auto-check', HIDDEN)).toBeTruthy();
  });

  it('switches to automatic on the auto row', async () => {
    const onSelectAuto = jest.fn();
    const view = await renderUi(sheet({ onSelectAuto, source: 'manual' }));

    await fireEvent.press(view.getByTestId('salah-location-sheet-auto'));

    expect(onSelectAuto).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId('salah-location-sheet-auto-check', HIDDEN)).toBeNull();
  });

  it('filters the gazetteer and reports the picked city', async () => {
    const onSelectCity = jest.fn();
    const view = await renderUi(sheet({ onSelectCity }));

    await fireEvent.changeText(view.getByTestId('salah-location-sheet-search-input'), 'مكة');

    const row = view.getByTestId('salah-location-sheet-city-makkah');
    expect(view.getByText('مكة المكرمة')).toBeTruthy();

    await fireEvent.press(row);
    expect(onSelectCity).toHaveBeenCalledWith(expect.objectContaining({ id: 'makkah', lat: 21.4225, lng: 39.8262 }));
  });

  it('marks the stored manual city and names its country', async () => {
    const view = await renderUi(sheet({ cityId: 'makkah', source: 'manual' }));

    await fireEvent.changeText(view.getByTestId('salah-location-sheet-search-input'), 'مكة');

    expect(view.getByTestId('salah-location-sheet-city-makkah-check', HIDDEN)).toBeTruthy();
    expect(view.getByText('السعودية')).toBeTruthy();
  });

  it('says when nothing matches', async () => {
    const view = await renderUi(sheet());

    await fireEvent.changeText(view.getByTestId('salah-location-sheet-search-input'), 'zzz');

    expect(view.getByTestId('salah-location-sheet-empty')).toHaveTextContent('لا نتائج مطابقة');
  });

  it('shows the denial note only when permission was denied', async () => {
    const view = await renderUi(sheet({ permissionDenied: true }));
    expect(view.getByTestId('salah-location-sheet-denied')).toBeTruthy();

    await view.rerender(sheet());
    expect(view.queryByTestId('salah-location-sheet-denied')).toBeNull();
  });

  it('closes from the backdrop and the header button', async () => {
    const onClose = jest.fn();
    const view = await renderUi(sheet({ onClose }));

    await fireEvent.press(view.getByTestId('salah-location-sheet-backdrop', HIDDEN));
    await fireEvent.press(view.getByLabelText('إغلاق'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('LocationPickerSheet keyboard and height (ADR 0036)', () => {
  afterEach(() => {
    resetWindowSize();
  });

  it('lifts the sheet with the keyboard through a keyboard-avoiding view', async () => {
    const view = await renderUi(sheet());

    expect(view.getByTestId('salah-location-sheet-keyboard')).toBeTruthy();
    expect(view.getByTestId('salah-location-sheet-search')).toBeTruthy();
  });

  it('caps the results at 320 on a tall window', async () => {
    const view = await renderUi(sheet());

    expect(flatStyle(view.getByTestId('salah-location-sheet-results').props.style).maxHeight).toBe(320);
  });

  it('caps the results at half the window on a short one, so the field stays in view', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(sheet());

    expect(flatStyle(view.getByTestId('salah-location-sheet-results').props.style).maxHeight).toBe(195);
  });

  it.each([
    [300, 150],
    [390, 195],
    [700, 320],
    [1000, 320],
  ])('resultsMaxHeight(%i) is %i', (windowHeight, expected) => {
    expect(resultsMaxHeight(windowHeight)).toBe(expected);
  });
});
