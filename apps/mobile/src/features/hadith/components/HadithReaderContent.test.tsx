import { screen } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { PLACEHOLDER_TEXT } from '../../../../jest/hadith-ui-fixtures';
import type { HadithReaderData } from '../types';

import { HadithReaderContent } from './HadithReaderContent';

const TEXT = 'نَصٌّ تَجْرِيبِيٌّ مُشَكَّلٌ لِلْعَرْضِ فَقَطْ — لَيْسَ حَدِيثًا';

function readerData(over: Partial<HadithReaderData> = {}, hadithNumber = '1234'): HadithReaderData {
  return {
    hadith: {
      resourceId: -1,
      id: 1,
      bookId: 1,
      chapterId: null,
      hadithNumber,
      arabicNumber: null,
      position: 1,
      textAr: PLACEHOLDER_TEXT,
      collection: { slug: 'bukhari', number: 1, titleAr: '[اسم المجموعة]', titleEn: '[Collection name]', attributionAr: '[سطر النسبة]', attributionEn: '[Attribution line]' },
      book: { id: 1, bookNumber: '1', titleAr: '[اسم الكتاب]', titleEn: '[Book name]', position: 1 },
      chapter: null,
      sourceUrl: null,
    },
    previous: { hadithNumber: '1233', bookId: 1, chapterId: null },
    next: { hadithNumber: '1235', bookId: 1, chapterId: null },
    ...over,
  };
}

function renderContent(data: HadithReaderData, over: Partial<{ showHeader: boolean; totalHadith: number | null }> = {}) {
  const callbacks = {
    onToggleSave: jest.fn(),
    onCopy: jest.fn(),
    onShare: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    onBack: jest.fn(),
  };
  return renderUi(
    <HadithReaderContent
      data={data}
      saved={false}
      showHeader={over.showHeader ?? true}
      totalHadith={over.totalHadith === undefined ? 5432 : over.totalHadith}
      {...callbacks}
    />,
  ).then(() => callbacks);
}

describe('HadithReaderContent', () => {
  it('shows the reader card with the number label, the text and the source line', async () => {
    await renderContent(readerData());
    expect(screen.getByText('حديث رقم ١٢٣٤')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(PLACEHOLDER_TEXT);
    // A fawazahmed0 row draws the collection attribution alone; the repeated credit is not drawn.
    expect(screen.getByText('[سطر النسبة]')).toBeOnTheScreen();
    expect(screen.queryByText('المصدر: fawazahmed0/hadith-api')).toBeNull();
  });

  it('shows the pager with the number and the collection total', async () => {
    await renderContent(readerData());
    expect(screen.getByTestId('hadith-reader-content-pager')).toHaveTextContent(/^١٢٣٤ من /);
  });

  it('disables previous at the start and next at the end', async () => {
    const callbacks = await renderContent(readerData({ previous: null, next: null }));
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'التالي' })).toBeDisabled();
    await press(screen.getByRole('button', { name: 'السابق' }));
    expect(callbacks.onPrevious).not.toHaveBeenCalled();
  });

  it('shows a single number today', async () => {
    await renderContent(readerData({}, '5709'));
    expect(screen.getByText('حديث رقم ٥٧٠٩')).toBeOnTheScreen();
    expect(screen.queryByText(/–/)).toBeNull();
  });

  it('hides the header when showHeader is false', async () => {
    await renderContent(readerData(), { showHeader: false });
    expect(screen.queryByTestId('hadith-reader-header')).toBeNull();
  });

  it('shows the header with its back button when showHeader is true', async () => {
    const callbacks = await renderContent(readerData());
    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(callbacks.onBack).toHaveBeenCalledTimes(1);
  });

  it('draws no grade section', async () => {
    await renderContent(readerData());
    expect(screen.queryByText(/grade/i)).toBeNull();
  });

  it('passes the stored text through byte for byte', async () => {
    await renderContent(readerData({ hadith: { ...readerData().hadith, textAr: TEXT } }));
    expect(screen.getByTestId('hadith-reader-content-card-text')).toHaveTextContent(TEXT);
  });

  it('never centres the text', async () => {
    await renderContent(readerData());
    expect(flatStyle(screen.getByTestId('hadith-reader-content-card-text').props.style).textAlign).not.toBe('center');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithReaderContent.tsx')).toEqual([]);
  });


  it('hides copy and share for a placeholder, keeps save, and keeps previous and next', async () => {
    await renderContent(readerData({ hadith: { ...readerData().hadith, hadithNumber: '1234', textAr: '', sourceCode: 'unavailable' } }));
    expect(screen.getByTestId('hadith-reader-content-card-unavailable')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'نسخ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'مشاركة' })).toBeNull();
    expect(screen.getByTestId('hadith-reader-header-toolbar-save')).toBeOnTheScreen();
    expect(screen.getByTestId('hadith-reader-content-pager-next')).toBeOnTheScreen();
  });
});
