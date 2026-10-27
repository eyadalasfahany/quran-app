import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { ResumePill } from './ResumePill';

describe('ResumePill', () => {
  it.each(locales)('labels the return control in %s', async (locale) => {
    const onPress = jest.fn();
    const view = await renderUi(<ResumePill onPress={onPress} />, { locale });
    const button = view.getByRole('button');
    expect(button.props.accessibilityLabel).toBe(locale === 'ar' ? 'العودة إلى الآية الحالية' : 'Back to the current ayah');
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a full touch target with bar-sized text on a glass pill', async () => {
    const view = await renderUi(<ResumePill onPress={() => undefined} />);

    expect(view.getByTestId('reader-resume')).toBeOnTheScreen();
    expect(flatStyle(view.getByRole('button').props.style).minHeight).toBe(themes.light.size.touchTarget);
    const label = view.getByText('العودة إلى الآية الحالية');
    expect(label.props.maxFontSizeMultiplier).toBe(maxFontScale.bar);
    expect(flatStyle(label.props.style)).toMatchObject({ color: themes.light.colors.ink, fontSize: themes.light.text.subhead.fontSize });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ResumePill.tsx')).toEqual([]);
  });
});
