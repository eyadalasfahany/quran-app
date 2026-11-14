import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { MENU_SEERAH_ICON, SeerahMenuCard } from './SeerahMenuCard';

describe('SeerahMenuCard', () => {
  it.each(locales)('shows the title and the subtitle (%s)', async (locale) => {
    await renderUi(<SeerahMenuCard onPress={jest.fn()} />, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'السيرة, السيرة النبوية, على الخريطة والخط الزمني' : 'Seerah, Seerah, On the map and the timeline' })).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-seerah-preview')).toHaveTextContent(locale === 'ar' ? 'على الخريطة والخط الزمني' : 'On the map and the timeline');
  });

  it('is one button reading caption, title and subtitle', async () => {
    await renderUi(<SeerahMenuCard onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'السيرة, السيرة النبوية, على الخريطة والخط الزمني' })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<SeerahMenuCard onPress={onPress} />);
    await press(screen.getByTestId('menu-card-seerah'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the map icon and the theme', async () => {
    expect(MENU_SEERAH_ICON.ios).toBe('map');
    await renderUi(<SeerahMenuCard onPress={jest.fn()} />, { theme: 'dark' });
    expect(flatStyle(screen.getByTestId('menu-card-seerah').props.style as never).backgroundColor).toBe(themes.dark.colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahMenuCard.tsx')).toEqual([]);
  });
});
