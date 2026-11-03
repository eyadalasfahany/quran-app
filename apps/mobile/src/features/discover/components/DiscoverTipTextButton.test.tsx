import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { DiscoverTipTextButton } from './DiscoverTipTextButton';

describe('DiscoverTipTextButton', () => {
  it('is a 44 pt button named by its label, and calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<DiscoverTipTextButton label="تخطي" onPress={onPress} testID="skip" />);

    const button = view.getByRole('button', { name: 'تخطي' });
    expect(flatStyle(button.props.style).minHeight).toBe(themes.light.size.touchTarget);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverTipTextButton label={locale === 'ar' ? 'تخطي' : 'Skip'} onPress={jest.fn()} />, { locale });
    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverTipTextButton.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
