import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { chapterFixture } from '../../../../jest/hadith-ui-fixtures';
import type { HadithBookOutlineItem } from '../types';

import { HadithChapterList } from './HadithChapterList';

const TEST_ID = 'hadith-chapter-list';

function chapterItem(over: Parameters<typeof chapterFixture>[0] = {}): HadithBookOutlineItem {
  return { kind: 'chapter', chapter: chapterFixture(over) };
}

const RUN: HadithBookOutlineItem = {
  kind: 'run',
  firstNumber: '4',
  lastNumber: '5',
  count: 2,
  firstPosition: 4,
  lastPosition: 5,
};

function renderList(items: HadithBookOutlineItem[], handlers: { onOpenChapter?: jest.Mock; onOpenRun?: jest.Mock } = {}) {
  return renderUi(
    <HadithChapterList
      items={items}
      onOpenChapter={handlers.onOpenChapter ?? jest.fn()}
      onOpenRun={handlers.onOpenRun ?? jest.fn()}
    />,
  );
}

describe('HadithChapterList', () => {
  it('renders one row per chapter in the given order, with runs in place', async () => {
    await renderList([
      chapterItem({ id: 7, chapterNumber: 2, titleAr: '[اسم الباب الثاني]' }),
      { ...RUN, firstPosition: 1, lastPosition: 2 },
      chapterItem({ id: 5, chapterNumber: 1, titleAr: '[اسم الباب الأول]' }),
    ]);
    expect(screen.getByTestId(`${TEST_ID}-item-7`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-run-1`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-item-5`)).toBeOnTheScreen();
    expect(screen.getAllByTestId(`${TEST_ID}-gap`)).toHaveLength(2);
  });

  it('calls onOpenChapter with the chapter', async () => {
    const onOpenChapter = jest.fn();
    const chapter = chapterFixture({ id: 3 });
    await renderList([{ kind: 'chapter', chapter }], { onOpenChapter });
    await press(screen.getByTestId(`${TEST_ID}-item-3`));
    expect(onOpenChapter).toHaveBeenCalledWith(chapter);
  });

  it('calls onOpenRun with the run positions', async () => {
    const onOpenRun = jest.fn();
    await renderList([RUN], { onOpenRun });
    await press(screen.getByTestId(`${TEST_ID}-run-4`));
    expect(onOpenRun).toHaveBeenCalledWith(RUN);
  });

  it('shows the Arabic chapter title in the English UI', async () => {
    await renderUi(<HadithChapterList items={[chapterItem({ id: 3, titleAr: '[اسم الباب]' })]} onOpenChapter={jest.fn()} onOpenRun={jest.fn()} />, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-item-3-title`)).toHaveTextContent('[اسم الباب]');
  });
});
