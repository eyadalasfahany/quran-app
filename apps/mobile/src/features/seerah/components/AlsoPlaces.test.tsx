import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { AlsoPlaces } from './AlsoPlaces';

const places = [
  { id: 'madinah', name: 'المدينة' },
  { id: 'makkah', name: 'مكة' },
];

describe('AlsoPlaces', () => {
  it.each(locales)('shows the caption and each place (%s)', async (locale) => {
    await renderUi(<AlsoPlaces onPress={jest.fn()} places={places} />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'أماكن مذكورة أيضًا:' : 'Also mentioned:')).toBeOnTheScreen();
    expect(screen.getByText('المدينة')).toBeOnTheScreen();
    expect(screen.getByText('مكة')).toBeOnTheScreen();
  });

  it('separates the places with a middle dot', async () => {
    await renderUi(<AlsoPlaces onPress={jest.fn()} places={places} />);
    expect(screen.getAllByText('·')).toHaveLength(1);
  });

  it('reports the tapped place', async () => {
    const onPress = jest.fn();
    await renderUi(<AlsoPlaces onPress={onPress} places={places} />);
    await press(screen.getByRole('button', { name: 'المكان: مكة. يعرضه على الخريطة' }));
    expect(onPress).toHaveBeenCalledWith('makkah');
  });

  it('gives each link a 44 pt target', async () => {
    await renderUi(<AlsoPlaces onPress={jest.fn()} places={places} />);
    expect(flatStyle(screen.getByTestId('seerah-also-places-madinah').props.style).minHeight).toBe(44);
  });

  it('renders nothing without places', async () => {
    await renderUi(<AlsoPlaces onPress={jest.fn()} places={[]} />);
    expect(screen.queryByTestId('seerah-also-places')).toBeNull();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/AlsoPlaces.tsx')).toEqual([]);
    expect(themes.light.colors.brand).toBeDefined();
  });
});
