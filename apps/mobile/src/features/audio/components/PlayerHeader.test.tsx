import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { PlayerHeader } from './PlayerHeader';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

describe('PlayerHeader', () => {
  it.each(locales)('shows the minimize button, the now-playing label and a disabled more button (%s)', async (locale) => {
    const view = await renderUi(<PlayerHeader onMinimize={() => undefined} />, { locale, theme: 'dark' });
    const minimize = locale === 'ar' ? 'تصغير المشغّل' : 'Minimize player';
    const more = locale === 'ar' ? 'المزيد' : 'More';

    expect(view.getByRole('button', { name: minimize })).toBeOnTheScreen();
    expect(view.getByText(locale === 'ar' ? 'يُتلى الآن' : 'Now playing')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: more })).toBeDisabled();
  });

  it('calls onMinimize when the minimize button is pressed', async () => {
    const onMinimize = jest.fn();
    const view = await renderUi(<PlayerHeader onMinimize={onMinimize} />);

    fireEvent.press(view.getByRole('button', { name: 'تصغير المشغّل' }));
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerHeader.tsx')).toEqual([]);
  });
});
