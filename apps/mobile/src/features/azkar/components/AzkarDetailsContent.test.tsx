import { screen } from '@testing-library/react-native';

import { makeDetail, makeEntry, makeItem, makeNote, emptyNotes, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarDetailsContent, noteBody, noteCaption } from './AzkarDetailsContent';

describe('AzkarDetailsContent', () => {
  it('shows only the occasion and source when the entry has no notes', async () => {
    await renderUi(<AzkarDetailsContent detail={makeDetail()} />);
    expect(screen.getByText('المناسبة')).toBeTruthy();
    expect(screen.getByText('الصباح')).toBeTruthy();
    expect(screen.getByText('المصدر')).toBeTruthy();
    expect(screen.getByText('حصن المسلم · رقم ٢٠')).toBeTruthy();
    for (const title of ['التعليمات', 'السياق', 'المعنى', 'الفضل', 'المرجع', 'الدرجة']) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it('hides the occasion when the entry has none', async () => {
    await renderUi(<AzkarDetailsContent detail={makeDetail({ entry: makeEntry({ occasion: null }) })} />);
    expect(screen.queryByText('المناسبة')).toBeNull();
  });

  it('shows every populated section in order', async () => {
    const notes = {
      ...emptyNotes(),
      context: [makeNote('context')],
      explanation: [makeNote('explanation')],
      virtue: [makeNote('virtue')],
      reference: [makeNote('reference')],
      grade: [makeNote('grade', { textAr: null, grader: '[الدرجة تجريبية]' })],
    };
    const instruction = makeItem({ id: 9, kind: 'instruction', requiredCount: null, segments: [textSegment('[تعليمات تجريبية]')] });
    await renderUi(<AzkarDetailsContent detail={makeDetail({ items: [makeItem(), instruction], notes })} />);
    for (const title of ['المناسبة', 'التعليمات', 'السياق', 'المعنى', 'الفضل', 'المرجع', 'الدرجة', 'المصدر']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText('[تعليمات تجريبية]')).toBeTruthy();
    expect(screen.getByText('[الدرجة تجريبية]')).toBeTruthy();
  });

  it('shows the English text of a note in the English interface', async () => {
    const notes = { ...emptyNotes(), explanation: [makeNote('explanation')] };
    await renderUi(<AzkarDetailsContent detail={makeDetail({ notes })} />, { locale: 'en' });
    expect(screen.getByText('FIXTURE note explanation — not a dhikr')).toBeTruthy();
    expect(screen.getByText('Meaning')).toBeTruthy();
    expect(screen.getByText('Occasion')).toBeTruthy();
  });

  it('keeps the Arabic note out of the English interface when it has no English', async () => {
    const notes = { ...emptyNotes(), context: [makeNote('context', { textEn: null })] };
    await renderUi(<AzkarDetailsContent detail={makeDetail({ notes })} />, { locale: 'en' });
    expect(screen.queryByText('[ملاحظة تجريبية context — ليست ذكرًا]')).toBeNull();
    expect(screen.queryByText('Context')).toBeNull();
  });

  it('builds a note caption from the source name and reference', () => {
    const t = (key: string, options?: Record<string, string>) => `${key}:${JSON.stringify(options ?? {})}`;
    expect(noteCaption(makeNote('virtue'), t, 'ar')).toContain('"reference":"[مرجع تجريبي]"');
    expect(noteCaption(makeNote('virtue', { sourceReference: null }), t, 'ar')).toContain('sourceCaptionNoReference');
    expect(noteCaption(makeNote('virtue', { sourceName: ' ' }), t, 'ar')).toBeNull();
  });

  it('uses the grader when a note has no text in the locale', () => {
    expect(noteBody(makeNote('grade', { textAr: null, grader: 'G' }), 'ar')).toBe('G');
    expect(noteBody(makeNote('grade', { textEn: null, grader: null }), 'en')).toBeNull();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarDetailsContent.tsx')).toEqual([]);
  });
});
