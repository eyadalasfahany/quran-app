import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { GoldFrame } from './GoldFrame';

const gold = themes.light.colors.gold;

describe('GoldFrame', () => {
  it('draws the page rule from the Mushaf frame', async () => {
    const view = await renderUi(
      <GoldFrame testID="frame">
        <Text>صفحة</Text>
      </GoldFrame>,
    );

    expect(view.getByText('صفحة')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('frame').props.style)).toMatchObject({
      borderColor: gold,
      borderRadius: 6,
      borderWidth: 1.5,
      padding: 6,
    });
    expect(flatStyle(view.getByTestId('frame-inner').props.style)).toMatchObject({
      borderColor: gold,
      borderRadius: 3,
      borderWidth: 0.75,
    });
  });

  it('draws the tighter band variant and takes content padding', async () => {
    const view = await renderUi(<GoldFrame contentStyle={{ padding: 12 }} testID="frame" variant="band" />);

    expect(flatStyle(view.getByTestId('frame').props.style)).toMatchObject({ borderRadius: 4, borderWidth: 1, padding: 3 });
    expect(flatStyle(view.getByTestId('frame-inner').props.style)).toMatchObject({ borderRadius: 2, padding: 12 });
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<GoldFrame testID="frame" />, { locale });

    expect(view.getByTestId('frame')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('GoldFrame.tsx')).toEqual([]);
  });
});
