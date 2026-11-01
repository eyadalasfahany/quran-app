import { screen } from '@testing-library/react-native';

import { quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ORNATE_CLOSE, ORNATE_OPEN } from '@/shared/ui';
import { quranSegmentKey } from '../data/quran-segments';
import { dhikrBlocks, DhikrText } from './DhikrText';

// The Quran arrives already resolved (the reader resolves it once per unit). Placeholder verse text only.
function versesFor(...segments: { itemId: number; position: number }[]): ReadonlyMap<string, readonly string[]> {
  return new Map(segments.map((segment) => [quranSegmentKey(segment), ['آية تجريبية']]));
}

describe('DhikrText', () => {
  it('renders text segments in the reader font and merges consecutive text', async () => {
    await renderUi(
      <DhikrText quranVerses={new Map()} segments={[textSegment('نص تجريبي ١'), textSegment('نص تجريبي ٢', 2)]} />,
    );
    expect(screen.getByText('نص تجريبي ١ نص تجريبي ٢')).toBeTruthy();
  });

  it('renders a Quran segment from its resolved verses, wrapped in the ornate marks', async () => {
    const quran = quranSegment(1, null, 2);
    await renderUi(
      <DhikrText quranVerses={versesFor(quran)} segments={[textSegment('نص تجريبي ٣'), quran]} />,
    );
    expect(screen.getByText(`${ORNATE_OPEN}آية تجريبية${ORNATE_CLOSE}`)).toBeTruthy();
  });

  it('joins several verses of one segment with one space, as stored', async () => {
    const quran = quranSegment(1, 2, 2);
    await renderUi(
      <DhikrText
        quranVerses={new Map([[quranSegmentKey(quran), ['الأولى', 'الثانية']]])}
        segments={[quran]}
      />,
    );
    expect(screen.getByText(`${ORNATE_OPEN}الأولى الثانية${ORNATE_CLOSE}`)).toBeTruthy();
  });

  it('renders no block for a Quran segment that does not resolve', async () => {
    await renderUi(<DhikrText quranVerses={new Map()} segments={[quranSegment(9, null)]} />);
    expect(screen.queryByText(`${ORNATE_OPEN}${ORNATE_CLOSE}`)).toBeNull();
    expect(screen.queryByText(new RegExp(ORNATE_OPEN))).toBeNull();
  });

  it('renders the same placeholder in English without changing the Arabic', async () => {
    await renderUi(<DhikrText quranVerses={new Map()} segments={[textSegment('نص تجريبي ٤')]} />, { locale: 'en' });
    expect(screen.getByText('نص تجريبي ٤')).toBeTruthy();
  });

  it('keeps the dhikr centred but reads it RTL in English', async () => {
    await renderUi(<DhikrText quranVerses={new Map()} segments={[textSegment('نص تجريبي ٤')]} />, { locale: 'en' });

    expect(flatStyle(screen.getByText('نص تجريبي ٤').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('groups consecutive text and keeps each Quran block in order', () => {
    const blocks = dhikrBlocks([
      textSegment('أ'),
      textSegment('ب', 2),
      quranSegment(1, null, 3),
      textSegment('ج', 4),
      textSegment(null, 5),
    ]);
    expect(blocks.map((block) => (block.kind === 'text' ? block.text : block.kind))).toEqual(['أ ب', 'quran', 'ج']);
  });

  it('keys a Quran segment by its item and position, so two items never share a verse', () => {
    expect(quranSegmentKey({ itemId: 1, position: 2 })).not.toBe(quranSegmentKey({ itemId: 2, position: 2 }));
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/DhikrText.tsx')).toEqual([]);
  });
});
