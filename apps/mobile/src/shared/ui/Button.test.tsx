import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Button } from './Button';

const colors = themes.light.colors;
const hidden = { includeHiddenElements: true };

describe('Button', () => {
  it('renders a 44 pt secondary pill with a 17 / 600 label and calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<Button label="حفظ" onPress={onPress} testID="button" />);
    const button = view.getByRole('button', { name: 'حفظ' });

    expect(flatStyle(view.getByTestId('button').props.style)).toMatchObject({
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
      borderRadius: themes.light.radius.pill,
      minHeight: 44,
      paddingHorizontal: 20,
    });
    expect(flatStyle(view.getByText('حفظ').props.style)).toMatchObject({
      color: colors.ink,
      fontFamily: 'IBMPlexSansArabic-SemiBold',
      fontSize: 17,
    });

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['primary', colors.brand, colors.onBrand],
    ['ghost', 'transparent', colors.brand],
    ['danger', 'transparent', colors.danger],
  ] as const)('draws the %s variant', async (variant, background, ink) => {
    const view = await renderUi(<Button label="زر" onPress={() => undefined} testID="button" variant={variant} />);

    expect(flatStyle(view.getByTestId('button').props.style).backgroundColor).toBe(background);
    expect(flatStyle(view.getByText('زر').props.style).color).toBe(ink);
  });

  it('draws the small size at 13 / 600', async () => {
    const view = await renderUi(<Button label="تنزيل" onPress={() => undefined} size="small" testID="button" />);

    expect(flatStyle(view.getByText('تنزيل').props.style)).toMatchObject({
      fontFamily: 'IBMPlexSansArabic-SemiBold',
      fontSize: 13,
    });
    expect(flatStyle(view.getByTestId('button').props.style).paddingHorizontal).toBe(16);
  });

  it('is disabled with a muted label and does not call onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<Button disabled label="حفظ" onPress={onPress} testID="button" variant="primary" />);
    const button = view.getByRole('button', { name: 'حفظ' });

    expect(button).toBeDisabled();
    expect(flatStyle(view.getByTestId('button').props.style).backgroundColor).toBe(colors.fillSecondary);
    expect(flatStyle(view.getByText('حفظ').props.style).color).toBe(colors.inkMuted);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('stretches to its container when asked', async () => {
    const view = await renderUi(<Button label="زر" onPress={() => undefined} stretch testID="button" />);

    expect(flatStyle(view.getByTestId('button').props.style).alignSelf).toBe('stretch');
  });

  it.each(locales)('mirrors a directional icon in %s', async (locale) => {
    const view = await renderUi(
      <Button
        icon={{ ios: 'chevron.forward', android: 'chevron_right' }}
        label="التالية"
        mirrorIconInRtl
        onPress={() => undefined}
        testID="button"
      />,
      { locale },
    );

    expect(flatStyle(view.getByTestId('button-icon', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Button.tsx')).toEqual([]);
  });
});
