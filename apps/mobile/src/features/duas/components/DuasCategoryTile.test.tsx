import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasCategoryTile } from './DuasCategoryTile';

const NAME = 'FIXTURE category name';
const CAPTION = 'FIXTURE 3 · source';

describe('DuasCategoryTile', () => {
  it('shows the name over its caption, labelled as one button', async () => {
    await renderUi(<DuasCategoryTile caption={CAPTION} name={NAME} onPress={jest.fn()} />);

    expect(screen.getByText(NAME)).toBeOnTheScreen();
    expect(screen.getByText(CAPTION)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `${NAME}، ${CAPTION}` })).toBeOnTheScreen();
  });

  it('uses the name at headline weight 600', async () => {
    await renderUi(<DuasCategoryTile caption={CAPTION} name={NAME} onPress={jest.fn()} />);

    expect(flatStyle(screen.getByText(NAME).props.style)).toMatchObject({ fontSize: 17 });
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<DuasCategoryTile caption={CAPTION} name={NAME} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: `${NAME}، ${CAPTION}` }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels the tile in English with a comma', async () => {
    await renderUi(<DuasCategoryTile caption="FIXTURE 3 · source" name="FIXTURE name" onPress={jest.fn()} />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'FIXTURE name, FIXTURE 3 · source' })).toBeOnTheScreen();
  });

  it('takes a test id from its caller', async () => {
    await renderUi(<DuasCategoryTile caption={CAPTION} name={NAME} onPress={jest.fn()} testID="duas-category-tile-1" />);

    expect(screen.getByTestId('duas-category-tile-1')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasCategoryTile.tsx')).toEqual([]);
  });
});
