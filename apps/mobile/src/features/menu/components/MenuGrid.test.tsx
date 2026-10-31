import { screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';

import { MenuGrid } from './MenuGrid';

const names = ['one', 'two', 'three', 'four', 'five'];

describe('MenuGrid', () => {
  it('places the children alternately in two columns, the first in the first column', async () => {
    await renderUi(
      <MenuGrid>
        {names.map((name) => (
          <Text key={name}>{name}</Text>
        ))}
      </MenuGrid>,
    );

    const first = screen.getByTestId('menu-grid-column-0');
    const second = screen.getByTestId('menu-grid-column-1');
    expect(within(first).getByText('one')).toBeOnTheScreen();
    expect(within(first).getByText('three')).toBeOnTheScreen();
    expect(within(first).getByText('five')).toBeOnTheScreen();
    expect(within(second).getByText('two')).toBeOnTheScreen();
    expect(within(second).getByText('four')).toBeOnTheScreen();
  });

  it('keeps the alternation when a card is absent, so the columns stay in step', async () => {
    // A null child (an unavailable card, such as Azkar without content) takes no slot.
    await renderUi(
      <MenuGrid>
        <Text>one</Text>
        {null}
        <Text>three</Text>
        <Text>four</Text>
      </MenuGrid>,
    );

    expect(within(screen.getByTestId('menu-grid-column-0')).getByText('one')).toBeOnTheScreen();
    expect(within(screen.getByTestId('menu-grid-column-0')).getByText('four')).toBeOnTheScreen();
    expect(within(screen.getByTestId('menu-grid-column-1')).getByText('three')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/menu/components/MenuGrid.tsx')).toEqual([]);
  });
});
