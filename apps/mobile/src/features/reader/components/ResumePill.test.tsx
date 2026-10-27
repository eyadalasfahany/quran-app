import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
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

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ResumePill.tsx')).toEqual([]);
  });
});
