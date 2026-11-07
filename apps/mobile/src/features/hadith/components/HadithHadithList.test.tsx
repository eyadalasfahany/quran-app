import { fireEvent, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { listItemFixture, PLACEHOLDER_TEXT } from '../../../../jest/hadith-ui-fixtures';

import { HadithHadithList } from './HadithHadithList';

const TEST_ID = 'hadith-hadith-list';
const CARD_1 = `${TEST_ID}-item-1`;
const CARD_2 = `${TEST_ID}-item-2`;

describe('HadithHadithList', () => {
  it('renders one card per item 12 apart', async () => {
    const items = [listItemFixture({ id: 1, hadithNumber: '1' }), listItemFixture({ id: 2, hadithNumber: '2' })];
    await renderUi(<HadithHadithList hasMore={false} items={items} onLoadMore={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByTestId(CARD_1)).toBeOnTheScreen();
    expect(screen.getByTestId(CARD_2)).toBeOnTheScreen();
    expect(screen.getAllByTestId(`${TEST_ID}-gap`)).toHaveLength(1);
    expect(screen.getByTestId(`${TEST_ID}-gap`).props.style).toEqual({ height: 12 });
  });

  it('calls onOpen with the item', async () => {
    const onOpen = jest.fn();
    const item = listItemFixture({ id: 1, hadithNumber: '1' });
    await renderUi(<HadithHadithList hasMore={false} items={[item]} onLoadMore={jest.fn()} onOpen={onOpen} />);
    await press(screen.getByTestId(CARD_1));
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('marks saved numbers', async () => {
    const items = [listItemFixture({ id: 1, hadithNumber: '1' }), listItemFixture({ id: 2, hadithNumber: '2' })];
    await renderUi(<HadithHadithList hasMore={false} items={items} onLoadMore={jest.fn()} onOpen={jest.fn()} savedNumbers={new Set(['2'])} />);
    expect(screen.queryByTestId(`${CARD_1}-saved`, { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId(`${CARD_2}-saved`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('renders the header', async () => {
    const header = <View testID="fixture-header" />;
    await renderUi(<HadithHadithList header={header} hasMore={false} items={[listItemFixture({ id: 1, hadithNumber: '1' })]} onLoadMore={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByTestId('fixture-header', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows a decimal number as given', async () => {
    await renderUi(
      <HadithHadithList hasMore={false} items={[listItemFixture({ id: 1, hadithNumber: '3.1' })]} onLoadMore={jest.fn()} onOpen={jest.fn()} />,
      { locale: 'en' },
    );
    expect(screen.getByLabelText('Hadith 3.1, ' + PLACEHOLDER_TEXT, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('passes the stored text through byte for byte', async () => {
    const text = 'نَصٌّ تَجْرِيبِيٌّ مُشَكَّلٌ لِلْعَرْضِ فَقَطْ — لَيْسَ حَدِيثًا';
    await renderUi(
      <HadithHadithList hasMore={false} items={[listItemFixture({ id: 1, textAr: text })]} onLoadMore={jest.fn()} onOpen={jest.fn()} />,
    );
    expect(screen.getByTestId(`${CARD_1}-text`, { includeHiddenElements: true })).toHaveTextContent(text);
  });

  it('calls onLoadMore near the end only when hasMore', async () => {
    const onLoadMore = jest.fn();
    const items = [listItemFixture({ id: 1, hadithNumber: '1' })];
    const first = await renderUi(<HadithHadithList hasMore={false} items={items} onLoadMore={onLoadMore} onOpen={jest.fn()} />);
    fireEvent(screen.getByTestId(TEST_ID), 'onEndReached');
    expect(onLoadMore).not.toHaveBeenCalled();
    first.unmount();
    await renderUi(<HadithHadithList hasMore items={items} onLoadMore={onLoadMore} onOpen={jest.fn()} />);
    fireEvent(screen.getByTestId(TEST_ID), 'onEndReached');
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithHadithList.tsx')).toEqual([]);
  });
});
