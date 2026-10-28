import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { HomeTileRow } from './HomeTileRow';

const list = { ios: 'list.bullet', android: 'format_list_bulleted' } as const;
const bookmark = { ios: 'bookmark', android: 'bookmark' } as const;

describe('HomeTileRow', () => {
  it('renders the tiles in order with a 10 px gap in a row', async () => {
    const view = await renderUi(
      <HomeTileRow
        tiles={[
          { icon: list, key: 'surahs', label: 'Surahs', onPress: () => undefined },
          { icon: bookmark, key: 'saved', label: 'Saved', onPress: () => undefined },
        ]}
      />,
      { locale: 'en' },
    );
    const row = view.getByTestId('home-tiles');

    expect(flatStyle(row.props.style)).toMatchObject({ flexDirection: 'row', gap: 10 });
    expect(row.children.length).toBe(2);
    expect(view.getByTestId('home-tiles-surahs')).toBeOnTheScreen();
    expect(view.getByTestId('home-tiles-saved')).toBeOnTheScreen();
    expect(view.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(['Surahs', 'Saved']);
  });

  it('gives every tile an equal share of the row', async () => {
    const view = await renderUi(
      <HomeTileRow
        tiles={[
          { icon: list, key: 'a', label: 'A', onPress: () => undefined },
          { icon: bookmark, key: 'b', label: 'B', onPress: () => undefined },
        ]}
        testID="row"
      />,
      { locale: 'en' },
    );

    expect(flatStyle(view.getByTestId('row-a').props.style).flex).toBe(1);
    expect(flatStyle(view.getByTestId('row-b').props.style).flex).toBe(1);
  });

  it('presses each tile to its own handler', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = await renderUi(
      <HomeTileRow
        tiles={[
          { icon: list, key: 'surahs', label: 'Surahs', onPress: first },
          { icon: bookmark, key: 'saved', label: 'Saved', onPress: second },
        ]}
      />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('button', { name: 'Saved' }));

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(
      <HomeTileRow tiles={[{ icon: list, key: 'surahs', label: 'label', onPress: () => undefined }]} />,
      { locale },
    );

    expect(view.getByTestId('home-tiles')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/HomeTileRow.tsx')).toEqual([]);
  });
});
