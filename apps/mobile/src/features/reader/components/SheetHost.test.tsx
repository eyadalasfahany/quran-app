import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';
import { Text, useWindowDimensions } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SETTINGS_SHEET_TOP, sheetHeight } from '../form-sheet';
import { SheetHost } from './SheetHost';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

function Measured() {
  const { height } = useWindowDimensions();
  return (
    <SheetHost topGap={SETTINGS_SHEET_TOP}>
      <Text testID="window-height">{String(height)}</Text>
    </SheetHost>
  );
}

describe('SheetHost', () => {
  beforeEach(() => {
    jest.mocked(router.back).mockClear();
  });

  it('stops the card at the design gap and leaves the page above it', async () => {
    const view = await renderUi(<Measured />);
    const windowHeight = Number(view.getByTestId('window-height').props.children);

    expect(flatStyle(view.getByTestId('sheet-host').props.style).height).toBe(
      sheetHeight(windowHeight, SETTINGS_SHEET_TOP),
    );
    expect(view.getByText(String(windowHeight))).toBeOnTheScreen();
  });

  it.each(locales)('closes from the page above the card in %s', async (locale) => {
    const view = await renderUi(
      <SheetHost topGap={SETTINGS_SHEET_TOP}>
        <Text>إعدادات</Text>
      </SheetHost>,
      { locale },
    );

    await fireEvent.press(view.getByTestId('sheet-backdrop'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('sheet-backdrop').props.accessibilityLabel).toBe(locale === 'ar' ? 'إغلاق' : 'Close');
  });

  it('dims the page behind the sheet with the scrim', async () => {
    const view = await renderUi(
      <SheetHost topGap={SETTINGS_SHEET_TOP}>
        <Text>إعدادات</Text>
      </SheetHost>,
    );

    expect(flatStyle(view.getByTestId('sheet-scrim').props.style).backgroundColor).toBe(themes.light.colors.scrim);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetHost.tsx')).toEqual([]);
  });
});
