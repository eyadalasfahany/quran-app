import { fireEvent, screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasCategoryGrid, type DuasCategoryGridItem } from './DuasCategoryGrid';

function makeItems(count: number, onPress = jest.fn()): DuasCategoryGridItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `fixture-${index + 1}`,
    name: `FIXTURE name ${index + 1}`,
    caption: `FIXTURE caption ${index + 1}`,
    onPress,
  }));
}

describe('DuasCategoryGrid', () => {
  it('shows the heading and one tile per item', async () => {
    await renderUi(<DuasCategoryGrid heading="FIXTURE heading" items={makeItems(3)} />);

    expect(screen.getByRole('header', { name: 'FIXTURE heading' })).toBeOnTheScreen();
    expect(screen.getByTestId('duas-category-grid-tile-fixture-1')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-category-grid-tile-fixture-2')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-category-grid-tile-fixture-3')).toBeOnTheScreen();
  });

  it('calls the matching item when its tile is pressed', async () => {
    const onFirst = jest.fn();
    const onSecond = jest.fn();
    await renderUi(
      <DuasCategoryGrid
        heading="FIXTURE heading"
        items={[
          { id: 'a', name: 'FIXTURE a', caption: 'FIXTURE caption a', onPress: onFirst },
          { id: 'b', name: 'FIXTURE b', caption: 'FIXTURE caption b', onPress: onSecond },
        ]}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'FIXTURE b، FIXTURE caption b' }));
    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
  });

  it('shows no toggle when none is given', async () => {
    await renderUi(<DuasCategoryGrid heading="FIXTURE heading" items={makeItems(2)} />);

    expect(screen.queryByTestId('duas-category-grid-toggle')).toBeNull();
  });

  it('shows the toggle as a button and calls it on press', async () => {
    const onToggle = jest.fn();
    await renderUi(
      <DuasCategoryGrid
        heading="FIXTURE heading"
        items={makeItems(2)}
        toggle={{ label: 'FIXTURE show all', expanded: false, onPress: onToggle }}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'FIXTURE show all' });
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reports an expanded toggle as expanded', async () => {
    await renderUi(
      <DuasCategoryGrid
        heading="FIXTURE heading"
        items={makeItems(2)}
        toggle={{ label: 'FIXTURE show less', expanded: true, onPress: jest.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'FIXTURE show less' }).props.accessibilityState).toMatchObject({ expanded: true });
  });

  it('keeps an odd last tile in its own row', async () => {
    await renderUi(<DuasCategoryGrid heading="FIXTURE heading" items={makeItems(3)} />);

    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renders in English', async () => {
    await renderUi(<DuasCategoryGrid heading="FIXTURE heading" items={makeItems(1)} />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'FIXTURE name 1, FIXTURE caption 1' })).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasCategoryGrid.tsx')).toEqual([]);
  });
});
