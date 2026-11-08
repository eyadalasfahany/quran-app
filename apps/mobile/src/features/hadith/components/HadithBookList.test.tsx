import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { ancestorStyle, bookFixture } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { HadithBookList } from './HadithBookList';

const TEST_ID = 'hadith-book-list';
const ROW_1 = `${TEST_ID}-item-1`;
const ROW_2 = `${TEST_ID}-item-2`;

describe('HadithBookList', () => {
  it('renders one row per book 12 apart', async () => {
    const books = [bookFixture({ id: 1 }), bookFixture({ id: 2, bookNumber: '2' })];
    await renderUi(<HadithBookList books={books} onOpen={jest.fn()} />);
    expect(screen.getByTestId(ROW_1)).toBeOnTheScreen();
    expect(screen.getByTestId(ROW_2)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-gap`).props.style).toEqual({ height: 12 });
  });

  it('calls onOpen with the book', async () => {
    const onOpen = jest.fn();
    const book = bookFixture({ id: 1 });
    await renderUi(<HadithBookList books={[book]} onOpen={onOpen} />);
    await press(screen.getByTestId(ROW_1));
    expect(onOpen).toHaveBeenCalledWith(book);
  });

  it('marks the selected book', async () => {
    await renderUi(<HadithBookList books={[bookFixture({ id: 1 }), bookFixture({ id: 2, bookNumber: '2' })]} onOpen={jest.fn()} selectedBookId={2} />);
    expect(screen.getByTestId(ROW_2)).toHaveProp('accessibilityState', { selected: true });
  });

  it('uses compact rows when asked', async () => {
    await renderUi(<HadithBookList books={[bookFixture({ id: 1 })]} compact onOpen={jest.fn()} />);
    expect(flatStyle(screen.getByTestId(ROW_1).props.style)).toMatchObject({ minHeight: 52 });
  });

  it('shows «كتاب n» for an untitled book in Arabic', async () => {
    await renderUi(<HadithBookList books={[bookFixture({ id: 1, bookNumber: '2', titleAr: null, titleEn: null })]} onOpen={jest.fn()} />);
    expect(screen.getByTestId(`${ROW_1}-title`)).toHaveTextContent('كتاب ٢');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithBookList.tsx')).toEqual([]);
  });

  it('leaves 16 points between the header and the first row', async () => {
    await renderUi(<HadithBookList books={[bookFixture({ id: 1 })]} header={<Text testID="list-header">[رأس]</Text>} onOpen={jest.fn()} />);
    expect(ancestorStyle(screen.getByTestId('list-header'), 'paddingBottom')).toBe(themes.light.space[4]);
  });
});
