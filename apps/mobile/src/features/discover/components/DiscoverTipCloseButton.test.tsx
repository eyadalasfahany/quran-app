import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { DiscoverTipCloseButton } from './DiscoverTipCloseButton';

describe('DiscoverTipCloseButton', () => {
  it('is a 44 × 44 button named by its label, and calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<DiscoverTipCloseButton label="إنهاء الجولة" onPress={onPress} />);

    const button = view.getByRole('button', { name: 'إنهاء الجولة' });
    const style = flatStyle(button.props.style);
    expect(style.width).toBe(themes.light.size.touchTarget);
    expect(style.height).toBe(themes.light.size.touchTarget);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverTipCloseButton label={locale === 'ar' ? 'إنهاء الجولة' : 'End the tour'} onPress={jest.fn()} />, { locale });
    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverTipCloseButton.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
