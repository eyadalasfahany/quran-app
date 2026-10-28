import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { FocusTransport } from './FocusTransport';

const theme = themes.light;

describe('FocusTransport', () => {
  it.each(locales)('labels every control in %s', async (locale) => {
    const view = await renderUi(<FocusTransport onNext={() => undefined} onPrevious={() => undefined} />, { locale });

    const labels =
      locale === 'ar'
        ? ['تكرار الآية ٣ مرات', 'الآية السابقة', 'تشغيل', 'الآية التالية', 'اختبر حفظك']
        : ['Repeat the ayah 3 times', 'Previous ayah', 'Play', 'Next ayah', 'Test your memorization'];
    expect(view.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(labels);
  });

  it('moves to the previous and next ayah', async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const view = await renderUi(<FocusTransport onNext={onNext} onPrevious={onPrevious} />);

    await fireEvent.press(view.getByTestId('focus-transport-previous'));
    await fireEvent.press(view.getByTestId('focus-transport-next'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables previous and next at the edges of the surah', async () => {
    const view = await renderUi(<FocusTransport />);

    expect(view.getByTestId('focus-transport-previous').props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByTestId('focus-transport-next').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('draws the play control as a brand circle and every step control at least a touch target wide', async () => {
    const view = await renderUi(<FocusTransport onNext={() => undefined} onPrevious={() => undefined} />);

    expect(flatStyle(view.getByTestId('focus-transport-play').props.style)).toMatchObject({
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radius.pill,
      height: 52,
      width: 52,
    });
    expect(flatStyle(view.getByTestId('focus-transport-previous').props.style).width).toBe(theme.size.touchTarget);
    expect(flatStyle(view.getByTestId('focus-transport-next').props.style).width).toBe(theme.size.touchTarget);
  });

  it('breaks the memorize label onto two lines in Arabic, as the frame does', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'ar' });
    const label = view.getByText('اختبر\nحفظك');

    expect(flatStyle(label.props.style)).toMatchObject({ fontSize: 13, lineHeight: theme.size.focusLabelLineHeight });
  });

  it('sets the transport labels in the 600 weight face', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'en' });

    expect(flatStyle(view.getByText('3×').props.style).fontFamily).toBe('IBMPlexSansArabic-SemiBold');
  });

  it.each(locales)('keeps the up and down chevrons unflipped in %s', async (locale) => {
    const view = await renderUi(<FocusTransport onNext={() => undefined} onPrevious={() => undefined} />, { locale });

    for (const id of ['focus-transport-previous', 'focus-transport-next']) {
      const [icon] = view.getByTestId(id).children;
      expect(flatStyle(typeof icon === 'object' ? icon.props.style : undefined).transform).toBeUndefined();
    }
  });

  it('shows the repeat count in Arabic numerals in Arabic', async () => {
    const view = await renderUi(<FocusTransport />, { locale: 'ar' });

    expect(view.getByTestId('focus-transport-repeat')).toHaveTextContent('٣', { exact: false });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/FocusTransport.tsx')).toEqual([]);
  });
});
