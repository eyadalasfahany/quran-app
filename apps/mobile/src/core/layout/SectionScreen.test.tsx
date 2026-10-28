import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { featureComponentLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SectionScreen } from './SectionScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 47 }),
  };
});

describe('SectionScreen', () => {
  it('renders the title as a header on the surface, below the top inset', async () => {
    const view = await renderUi(<SectionScreen testID="screen" title="الاستماع" />);

    expect(view.getByRole('header', { name: 'الاستماع' })).toBeOnTheScreen();
    expect(flatStyle(view.getByText('الاستماع').props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontFamily: 'Amiri-Bold',
      fontSize: 28,
      lineHeight: 36,
    });
    expect(flatStyle(view.getByTestId('screen').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surface,
      flex: 1,
      paddingTop: 47,
    });
  });

  it('renders its content under the title', async () => {
    const view = await renderUi(
      <SectionScreen testID="screen" title="الرئيسية">
        <Text>محتوى</Text>
      </SectionScreen>,
    );

    expect(view.getByText('محتوى')).toBeOnTheScreen();
  });

  it('renders the trailing control beside the title', async () => {
    const view = await renderUi(<SectionScreen testID="screen" title="الرئيسية" trailing={<Text>بحث</Text>} />);

    expect(view.getByText('بحث')).toBeOnTheScreen();
  });

  it.each(['light', 'sepia', 'dark'] as const)('draws the title in ink in %s', async (theme) => {
    const view = await renderUi(<SectionScreen testID="screen" title="title" />, { theme });

    expect(flatStyle(view.getByText('title').props.style).color).toBe(themes[theme].colors.ink);
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<SectionScreen testID="screen" title={locale} />, { locale });

    expect(view.getByRole('header', { name: locale })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('core/layout/SectionScreen.tsx')).toEqual([]);
  });
});
