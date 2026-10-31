import { screen } from '@testing-library/react-native';

import { quranSegment, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ORNATE_CLOSE, ORNATE_OPEN } from '@/shared/ui';
import { dhikrBlocks, DhikrText } from './DhikrText';

const resolveQuran = jest.fn((segment: { quranVerseFrom: number | null }) =>
  segment.quranVerseFrom === 1 ? 'آية تجريبية' : '',
);

beforeEach(() => resolveQuran.mockClear());

describe('DhikrText', () => {
  it('renders text segments in the reader font and merges consecutive text', async () => {
    await renderUi(<DhikrText resolveQuran={resolveQuran} segments={[textSegment('نص تجريبي ١'), textSegment('نص تجريبي ٢', 2)]} />);
    expect(screen.getByText('نص تجريبي ١ نص تجريبي ٢')).toBeTruthy();
  });

  it('renders a Quran segment from its resolved verses, wrapped in the ornate marks', async () => {
    await renderUi(
      <DhikrText
        resolveQuran={resolveQuran}
        segments={[textSegment('نص تجريبي ٣'), quranSegment(1, null, 2)]}
      />,
    );
    expect(resolveQuran).toHaveBeenCalledWith(expect.objectContaining({ kind: 'quran', quranVerseFrom: 1 }));
    expect(screen.getByText(`${ORNATE_OPEN}آية تجريبية${ORNATE_CLOSE}`)).toBeTruthy();
  });

  it('renders no block for a Quran segment that does not resolve', async () => {
    await renderUi(<DhikrText resolveQuran={resolveQuran} segments={[quranSegment(9, null)]} />);
    expect(screen.queryByText(`${ORNATE_OPEN}${ORNATE_CLOSE}`)).toBeNull();
    expect(resolveQuran).toHaveBeenCalledTimes(1);
  });

  it('renders the same placeholder in English without changing the Arabic', async () => {
    await renderUi(<DhikrText resolveQuran={resolveQuran} segments={[textSegment('نص تجريبي ٤')]} />, { locale: 'en' });
    expect(screen.getByText('نص تجريبي ٤')).toBeTruthy();
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

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/DhikrText.tsx')).toEqual([]);
  });
});
