import { fireEvent } from '@testing-library/react-native';

import { formatDate } from '@/core/i18n';
import { getNotes, saveNote } from '@/features/library/data';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';

import { locales, renderUi } from '../../../../jest/render-ui';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { NoteListCard } from './NoteListCard';

const chapter: ChapterRecord = {
  bismillahImlaei: null,
  bismillahPre: 1,
  bismillahText: null,
  id: 2,
  nameArabic: 'البقرة',
  nameEn: 'The Cow',
  nameSimple: 'Al-Baqarah',
  pageEnd: 49,
  pageStart: 2,
  revelationOrder: 87,
  revelationPlace: 'madinah',
  versesCount: 286,
};

const verse: VerseRecord = {
  chapterId: 2,
  hizb: 1,
  id: 262,
  juz: 3,
  page: 42,
  rubElHizb: 1,
  sajdah: 'none',
  textImlaei: null,
  textIndopak: null,
  textSearch: '',
  textUthmani: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ',
  textUthmaniTajweed: null,
  verseKey: '2:255',
  verseNumber: 255,
};

function renderList(overrides: { onEditNote?: jest.Mock; onOpenVerse?: jest.Mock } = {}) {
  const { store } = openUserTestStore();
  saveNote(262, 'تدبر في معنى الاستعاذة', store);
  const row = getNotes(262, store)[0]!;
  const onOpenVerse = overrides.onOpenVerse ?? jest.fn();
  const onEditNote = overrides.onEditNote ?? jest.fn();
  return renderUi(
    <NoteListCard
      items={[{ row, verse, chapter }]}
      onEditNote={onEditNote}
      onOpenMushaf={jest.fn()}
      onOpenVerse={onOpenVerse}
    />,
  ).then((view) => ({ onEditNote, onOpenVerse, view }));
}

describe('NoteListCard', () => {
  it.each(locales)('draws the empty state with the open-mushaf action (%s)', async (locale) => {
    const onOpenMushaf = jest.fn();
    const view = await renderUi(
      <NoteListCard items={[]} onEditNote={jest.fn()} onOpenMushaf={onOpenMushaf} onOpenVerse={jest.fn()} />,
      { locale },
    );

    expect(view.getByText(locale === 'ar' ? 'لا توجد ملاحظات بعد' : 'No notes yet')).toBeOnTheScreen();

    fireEvent.press(view.getByRole('button', { name: locale === 'ar' ? 'افتح المصحف' : 'Open the Mushaf' }));

    expect(onOpenMushaf).toHaveBeenCalledTimes(1);
  });

  it('lists each note with a two-line body preview and opens the reader on press', async () => {
    const onOpenVerse = jest.fn();
    const { view } = await renderList({ onOpenVerse });

    const row = view.getByRole('button', { name: 'البقرة · الآية ٢٥٥, تدبر في معنى الاستعاذة' });
    expect(view.getByText('تدبر في معنى الاستعاذة').props.numberOfLines).toBe(2);

    fireEvent.press(row);

    expect(onOpenVerse).toHaveBeenCalledWith('2:255');
  });

  it("shows the note's updated date under the preview", async () => {
    const { store } = openUserTestStore();
    saveNote(262, 'تدبر في معنى الاستعاذة', store);
    const row = getNotes(262, store)[0]!;
    const view = await renderUi(
      <NoteListCard
        items={[{ row, verse, chapter }]}
        onEditNote={jest.fn()}
        onOpenMushaf={jest.fn()}
        onOpenVerse={jest.fn()}
      />,
    );

    expect(view.getByText(formatDate(row.clientUpdatedAt, 'ar'))).toBeOnTheScreen();
  });

  it('hands the ayah to the edit affordance', async () => {
    const onEditNote = jest.fn();
    const { view } = await renderList({ onEditNote });

    fireEvent.press(view.getByRole('button', { name: 'تعديل الملاحظة' }));

    expect(onEditNote).toHaveBeenCalledWith('2:255');
  });
});
