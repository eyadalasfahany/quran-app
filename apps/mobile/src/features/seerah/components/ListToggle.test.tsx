import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { ListToggle } from './ListToggle';

describe('ListToggle', () => {
  it.each(locales)('on the map it offers the list (%s)', async (locale) => {
    await renderUi(<ListToggle onToggle={jest.fn()} view="map" />, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'عرض كقائمة' : 'Show as list' })).toBeOnTheScreen();
  });

  it.each(locales)('on the list it offers the map (%s)', async (locale) => {
    await renderUi(<ListToggle onToggle={jest.fn()} view="list" />, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'عرض كخريطة' : 'Show as map' })).toBeOnTheScreen();
  });

  it('calls onToggle', async () => {
    const onToggle = jest.fn();
    await renderUi(<ListToggle onToggle={onToggle} view="map" />);
    await press(screen.getByRole('button', { name: 'عرض كقائمة' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('is a 44 pt target', async () => {
    await renderUi(<ListToggle onToggle={jest.fn()} testID="toggle" view="map" />);
    expect(flatStyle(screen.getByTestId('toggle').props.style)).toMatchObject({ height: 44, width: 44 });
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/ListToggle.tsx')).toEqual([]);
    expect(themes.light.colors.surfaceRaised).toBeDefined();
  });
});
