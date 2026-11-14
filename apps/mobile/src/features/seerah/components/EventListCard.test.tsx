import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { EventListCard } from './EventListCard';

const rows = [
  { id: 'e1', subtitle: 'تبوك', title: 'عنوان ١' },
  { id: 'e2', subtitle: 'المدينة', title: 'عنوان ٢' },
];

describe('EventListCard', () => {
  it.each(locales)('renders one row per event (%s)', async (locale) => {
    await renderUi(<EventListCard onRowPress={jest.fn()} rows={rows} />, { locale });
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('reports the tapped row', async () => {
    const onRowPress = jest.fn();
    await renderUi(<EventListCard onRowPress={onRowPress} rows={rows} />);
    await press(screen.getByRole('button', { name: 'عنوان ٢, المدينة' }));
    expect(onRowPress).toHaveBeenCalledWith('e2');
  });

  it('puts a hairline between rows but not after the last', async () => {
    await renderUi(<EventListCard onRowPress={jest.fn()} rows={rows} testID="card" />);
    expect(flatStyle(screen.getByTestId('card-e1').props.style).borderBottomWidth).toBe(1);
    expect(flatStyle(screen.getByTestId('card-e2').props.style).borderBottomWidth).toBeUndefined();
  });

  it('is a solid card, and a dashed one for the unspecified group', async () => {
    const solid = await renderUi(<EventListCard onRowPress={jest.fn()} rows={rows} testID="card" />);
    expect(flatStyle(screen.getByTestId('card').props.style)).toMatchObject({ borderStyle: 'solid', backgroundColor: themes.light.colors.surfaceRaised });
    await solid.unmount();
    await renderUi(<EventListCard dashed onRowPress={jest.fn()} rows={rows} testID="card" />);
    expect(flatStyle(screen.getByTestId('card').props.style).borderStyle).toBe('dashed');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventListCard.tsx')).toEqual([]);
  });
});
