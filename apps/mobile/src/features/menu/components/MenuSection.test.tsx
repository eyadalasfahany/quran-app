import { colors } from '@quran/design-tokens';
import { fireEvent, screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { MenuCard } from './MenuCard';
import { MenuSection } from './MenuSection';

const ICON = { ios: 'book', android: 'menu_book' } as const;

function cards(count: number, onPress = jest.fn()) {
  return Array.from({ length: count }, (_, index) => (
    <MenuCard icon={ICON} key={index} onPress={onPress} testID={`card-${index}`} title={`t${index}`} />
  ));
}

describe('MenuSection', () => {
  it.each(locales)('titles the section as a header in %s', async (locale) => {
    const title = locale === 'ar' ? 'العبادة' : 'Worship';
    await renderUi(
      <MenuSection testID="s" title={title} tone="gold">
        {cards(1)}
      </MenuSection>,
      { locale },
    );

    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
  });

  it('colours the title and the cards’ tiles with its tone', async () => {
    await renderUi(
      <MenuSection testID="s" title="t" tone="blue">
        {cards(1)}
      </MenuSection>,
    );

    expect(flatStyle(screen.getByTestId('s-title').props.style).color).toBe(colors.light.tileBlueInk);
    expect(flatStyle(screen.getByTestId('card-0-tile').props.style).backgroundColor).toBe(colors.light.tileBlue);
  });

  it('draws the title in ink and lets cards keep their own tone without a section tone', async () => {
    await renderUi(
      <MenuSection testID="s" title="t">
        <MenuCard icon={ICON} onPress={jest.fn()} testID="card" title="c" tone="gold" />
      </MenuSection>,
    );

    expect(flatStyle(screen.getByTestId('s-title').props.style).color).toBe(colors.light.ink);
    expect(flatStyle(screen.getByTestId('card-tile').props.style).backgroundColor).toBe(colors.light.tileGold);
  });

  it('lays cards out in even rows of two by default, the odd last card one column wide', async () => {
    await renderUi(
      <MenuSection testID="s" title="t">
        {cards(3)}
      </MenuSection>,
    );

    expect(screen.getByTestId('s-row-0')).toContainElement(screen.getByTestId('card-1'));
    expect(screen.getByTestId('s-row-1')).toContainElement(screen.getByTestId('card-2'));
    expect(screen.getByTestId('s-row-1').children).toHaveLength(2);
    expect(flatStyle(screen.getByTestId('s-row-0').props.style)).toMatchObject({ flexDirection: 'row' });
  });

  it('puts three cards in a row with three columns', async () => {
    await renderUi(
      <MenuSection columns={3} testID="s" title="t">
        {cards(3)}
      </MenuSection>,
    );

    expect(screen.getByTestId('s-row-0')).toContainElement(screen.getByTestId('card-2'));
    expect(screen.queryByTestId('s-row-1')).toBeNull();
  });

  it('drops null cards and is not drawn when none are left', async () => {
    await renderUi(
      <MenuSection testID="s" title="t">
        {null}
        {false}
      </MenuSection>,
    );

    expect(screen.queryByTestId('s')).toBeNull();
  });

  it('passes presses through to its cards', async () => {
    const onPress = jest.fn();
    await renderUi(
      <MenuSection testID="s" title="t">
        {cards(1, onPress)}
      </MenuSection>,
    );

    fireEvent.press(screen.getByTestId('card-0'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/menu/components/MenuSection.tsx')).toEqual([]);
    expect(rawColorLiteralsInFeature('src/features/menu/components/menuTone.ts')).toEqual([]);
  });
});
