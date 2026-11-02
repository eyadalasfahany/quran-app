import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { BACK_ICON, BackButton } from './BackButton';

// Icons are hidden from screen readers, so queries have to opt in to see the glyph.
const hidden = { includeHiddenElements: true };

describe('BackButton', () => {
  it('renders a labelled button in Arabic', async () => {
    const view = await renderUi(<BackButton onPress={() => undefined} />, { locale: 'ar' });

    expect(view.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
  });

  it('renders a labelled button in English', async () => {
    const view = await renderUi(<BackButton onPress={() => undefined} />, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
  });

  it('is a 44 pt target', async () => {
    const view = await renderUi(<BackButton onPress={() => undefined} />);
    const style = flatStyle(view.getByRole('button').props.style);

    expect(style.height).toBeGreaterThanOrEqual(44);
    expect(style.width).toBeGreaterThanOrEqual(44);
  });

  it('calls onPress once when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<BackButton onPress={onPress} />);

    fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('points the glyph at the leading edge: left as drawn, mirrored to the right in RTL', () => {
    // The glyph is drawn pointing left; the component mirrors it only under RTL (see the it.each below).
    expect(BACK_ICON).toEqual({ ios: 'chevron.left', android: 'chevron_left' });
  });

  it.each(locales)('mirrors the chevron only in RTL (%s)', async (locale) => {
    const view = await renderUi(<BackButton onPress={() => undefined} testID="back" />, { locale });

    expect(flatStyle(view.getByTestId('back-icon', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it('takes a test id for the button', async () => {
    const view = await renderUi(<BackButton onPress={() => undefined} testID="custom-back" />);

    expect(view.getByTestId('custom-back')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('BackButton.tsx')).toEqual([]);
  });
});
