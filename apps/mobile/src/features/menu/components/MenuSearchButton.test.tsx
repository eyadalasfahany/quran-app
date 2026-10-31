import { fireEvent, screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { MenuSearchButton } from './MenuSearchButton';

describe('MenuSearchButton', () => {
  it('floats at the left edge, at the given clearance above the bottom', async () => {
    const view = await renderUi(<MenuSearchButton bottom={108} onPress={jest.fn()} />);

    const container = view.getByTestId('menu-search').parent;
    expect(flatStyle(container?.props.style)).toMatchObject({ bottom: 108, left: 20, position: 'absolute' });
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderUi(<MenuSearchButton bottom={108} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('menu-search'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('is labelled for search in %s', async (locale) => {
    await renderUi(<MenuSearchButton bottom={108} onPress={jest.fn()} />, { locale });

    expect(screen.getByRole('button', { name: locale === 'ar' ? 'بحث' : 'Search' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/menu/components/MenuSearchButton.tsx')).toEqual([]);
  });
});
