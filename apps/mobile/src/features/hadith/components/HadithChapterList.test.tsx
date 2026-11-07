import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { chapterFixture } from '../../../../jest/hadith-ui-fixtures';

import { HadithChapterList } from './HadithChapterList';

const TEST_ID = 'hadith-chapter-list';

describe('HadithChapterList', () => {
  it('renders one row per chapter in the given order', async () => {
    const chapters = [
      chapterFixture({ id: 7, chapterNumber: 2, titleAr: '[اسم الباب الثاني]' }),
      chapterFixture({ id: 5, chapterNumber: 1, titleAr: '[اسم الباب الأول]' }),
    ];
    await renderUi(<HadithChapterList chapters={chapters} onOpen={jest.fn()} />);
    const rows = screen.getAllByTestId(new RegExp(`^${TEST_ID}-item-\\d+$`));
    expect(rows.map((row) => row.props.testID)).toEqual([`${TEST_ID}-item-7`, `${TEST_ID}-item-5`]);
    expect(screen.getByTestId(`${TEST_ID}-gap`).props.style).toEqual({ height: 12 });
  });

  it('calls onOpen with the chapter', async () => {
    const onOpen = jest.fn();
    const chapter = chapterFixture({ id: 3 });
    await renderUi(<HadithChapterList chapters={[chapter]} onOpen={onOpen} />);
    await press(screen.getByTestId(`${TEST_ID}-item-3`));
    expect(onOpen).toHaveBeenCalledWith(chapter);
  });

  it('shows the Arabic chapter title in the English UI', async () => {
    await renderUi(<HadithChapterList chapters={[chapterFixture({ id: 3, titleAr: '[اسم الباب]' })]} onOpen={jest.fn()} />, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-item-3-title`)).toHaveTextContent('[اسم الباب]');
  });
});
