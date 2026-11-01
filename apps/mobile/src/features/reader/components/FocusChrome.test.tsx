import { fireEvent } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { FocusChrome } from './FocusChrome';

const props = {
  onExit: () => undefined,
  position: 'الفاتحة · الآية ٥ من ٧',
};

describe('FocusChrome', () => {
  it('draws the exit and the position, and no reader toolbar', async () => {
    const view = await renderUi(<FocusChrome {...props} />);

    expect(view.getByTestId('focus-exit')).toBeOnTheScreen();
    expect(view.getByText('الفاتحة · الآية ٥ من ٧')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-back')).toBeNull();
    expect(view.queryByTestId('reader-tools')).toBeNull();
    expect(view.queryByTestId('reader-title')).toBeNull();
  });

  it('keeps the exit at 44 pt and centres the position between it and a matching spacer', async () => {
    const view = await renderUi(<FocusChrome {...props} />);

    expect(flatStyle(view.getByTestId('focus-exit').props.style)).toMatchObject({ height: 44, width: 44 });
    expect(flatStyle(view.getByTestId('focus-position').props.style)).toMatchObject({ textAlign: 'center' });
  });

  it('calls onExit when the exit is pressed', async () => {
    const onExit = jest.fn();
    const view = await renderUi(<FocusChrome {...props} onExit={onExit} />);

    await fireEvent.press(view.getByTestId('focus-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the exit as a button in %s', async (locale) => {
    const view = await renderUi(<FocusChrome {...props} />, { locale });
    const exit = view.getByLabelText(locale === 'ar' ? 'خروج من وضع التركيز' : 'Exit Focus mode');

    expect(exit.props.accessibilityRole).toBe('button');
  });

  it.each(locales)('shows the position unchanged in %s', async (locale) => {
    const view = await renderUi(<FocusChrome position="Al-Fatiha · Ayah 5 of 7" onExit={() => undefined} />, { locale });

    expect(view.getByText('Al-Fatiha · Ayah 5 of 7')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/FocusChrome.tsx')).toEqual([]);
  });
});

describe('FocusChrome safe-area insets', () => {
  // A landscape cutout on the right: the start edge is the right in Arabic and the left in English.
  const insets = { bottom: 0, left: 40, right: 60, top: 24 };

  it.each(locales)('keeps the exit clear of the side insets from the start edge in %s', async (locale) => {
    const view = await renderUi(
      <SafeAreaInsetsContext.Provider value={insets}>
        <FocusChrome {...props} />
      </SafeAreaInsetsContext.Provider>,
      { locale },
    );

    const start = locale === 'ar' ? insets.right : insets.left;
    const end = locale === 'ar' ? insets.left : insets.right;
    expect(flatStyle(view.getByTestId('focus-chrome').props.style)).toMatchObject({
      paddingEnd: 16 + end,
      paddingStart: 16 + start,
      paddingTop: 24 + 8,
    });
  });

  it('adds no side padding without a safe area', async () => {
    const view = await renderUi(<FocusChrome {...props} />);

    expect(flatStyle(view.getByTestId('focus-chrome').props.style)).toMatchObject({ paddingEnd: 16, paddingStart: 16 });
  });
});
