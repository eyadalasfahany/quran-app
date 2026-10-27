import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { JuzRow } from './JuzRow';

describe('JuzRow', () => {
  it('renders the juz number and start verse', async () => {
    const view = await renderUi(
      <JuzRow juz={{ juz: 1, verseKey: '1:1' }} onPress={() => undefined} testID="juz-row" />,
    );

    expect(view.getByText('يبدأ من 1:1')).toBeOnTheScreen();
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<JuzRow juz={{ juz: 2, verseKey: '2:142' }} onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s direction', async (locale) => {
    const view = await renderUi(<JuzRow juz={{ juz: 30, verseKey: '78:1' }} onPress={() => undefined} />, {
      locale,
    });

    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/JuzRow.tsx')).toEqual([]);
  });
});
