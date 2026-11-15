import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasCategoryCard } from './DuasCategoryCard';

// Fixture text only: no dua is written here.
const PREVIEW = 'FIXTURE preview 1 — not a dua';
const CHAPTER = 'FIXTURE chapter title';
const CAPTION = 'FIXTURE source · ١٥٠';

describe('DuasCategoryCard', () => {
  describe('hisn variant', () => {
    it('shows the chapter title, the preview and the caption, with the position', async () => {
      await renderUi(
        <DuasCategoryCard caption={CAPTION} chapterTitle={CHAPTER} kind="hisn" number={2} onPress={jest.fn()} preview={PREVIEW} />,
      );

      expect(screen.getByText(CHAPTER)).toBeOnTheScreen();
      expect(screen.getByText(PREVIEW)).toBeOnTheScreen();
      expect(screen.getByText(CAPTION)).toBeOnTheScreen();
      expect(screen.getByTestId('duas-category-card-number', { includeHiddenElements: true })).toHaveTextContent('٢');
    });

    it('labels the card with the chapter title and the position, as one button', async () => {
      await renderUi(
        <DuasCategoryCard caption={CAPTION} chapterTitle={CHAPTER} kind="hisn" number={2} onPress={jest.fn()} preview={PREVIEW} />,
      );

      expect(screen.getByRole('button', { name: `٢، ${CHAPTER}` })).toBeOnTheScreen();
    });

    it('falls back to the preview in the label when there is no chapter title', async () => {
      await renderUi(
        <DuasCategoryCard caption={CAPTION} chapterTitle={null} kind="hisn" number={1} onPress={jest.fn()} preview={PREVIEW} />,
      );

      expect(screen.queryByText(CHAPTER)).toBeNull();
      expect(screen.getByRole('button', { name: `١، ${PREVIEW}` })).toBeOnTheScreen();
    });

    it('clamps the preview to two lines in the Amiri list size', async () => {
      await renderUi(
        <DuasCategoryCard caption={CAPTION} chapterTitle={CHAPTER} kind="hisn" number={1} onPress={jest.fn()} preview={PREVIEW} />,
      );

      const preview = screen.getByText(PREVIEW);
      expect(preview.props.numberOfLines).toBe(2);
      expect(flatStyle(preview.props.style)).toMatchObject({ fontSize: 19, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' });
    });

    it('leaves out the preview when there is none', async () => {
      await renderUi(<DuasCategoryCard caption={CAPTION} chapterTitle={CHAPTER} kind="hisn" number={1} onPress={jest.fn()} preview={null} />);

      expect(screen.getByText(CHAPTER)).toBeOnTheScreen();
      expect(screen.queryByText(PREVIEW)).toBeNull();
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      await renderUi(
        <DuasCategoryCard caption={CAPTION} chapterTitle={CHAPTER} kind="hisn" number={1} onPress={onPress} preview={PREVIEW} />,
      );

      await fireEvent.press(screen.getByRole('button', { name: `١، ${CHAPTER}` }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('labels the card in English with a comma', async () => {
      await renderUi(
        <DuasCategoryCard caption="FIXTURE source · 150" chapterTitle="FIXTURE chapter" kind="hisn" number={3} onPress={jest.fn()} preview={null} />,
        { locale: 'en' },
      );

      expect(screen.getByRole('button', { name: '3, FIXTURE chapter' })).toBeOnTheScreen();
      expect(screen.getByText('FIXTURE source · 150')).toBeOnTheScreen();
    });
  });

  describe('hadith variant', () => {
    it('shows the preview clamped to two lines, and no caption line', async () => {
      await renderUi(<DuasCategoryCard kind="hadith" number={4} onPress={jest.fn()} preview={PREVIEW} />);

      const preview = screen.getByText(PREVIEW);
      expect(preview.props.numberOfLines).toBe(2);
      expect(screen.queryByText(CAPTION)).toBeNull();
      expect(screen.getByRole('button', { name: `٤، ${PREVIEW}` })).toBeOnTheScreen();
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      await renderUi(<DuasCategoryCard kind="hadith" number={1} onPress={onPress} preview={PREVIEW} />);

      await fireEvent.press(screen.getByRole('button', { name: `١، ${PREVIEW}` }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('quran variant', () => {
    it('shows the reference as the title and no Quran text', async () => {
      await renderUi(<DuasCategoryCard kind="quran" number={1} onPress={jest.fn()} reference="FIXTURE surah · 1" />);

      expect(screen.getByText('FIXTURE surah · 1')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '١، FIXTURE surah · 1' })).toBeOnTheScreen();
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      await renderUi(<DuasCategoryCard kind="quran" number={1} onPress={onPress} reference="FIXTURE surah · 1" />);

      await fireEvent.press(screen.getByRole('button', { name: '١، FIXTURE surah · 1' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('labels the reference in English', async () => {
      await renderUi(<DuasCategoryCard kind="quran" number={2} onPress={jest.fn()} reference="FIXTURE surah · 2" />, { locale: 'en' });

      expect(screen.getByRole('button', { name: '2, FIXTURE surah · 2' })).toBeOnTheScreen();
    });
  });

  it('takes a test id from its caller', async () => {
    await renderUi(<DuasCategoryCard kind="quran" number={1} onPress={jest.fn()} reference="FIXTURE" testID="duas-card-1" />);

    expect(screen.getByTestId('duas-card-1')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasCategoryCard.tsx')).toEqual([]);
  });
});
