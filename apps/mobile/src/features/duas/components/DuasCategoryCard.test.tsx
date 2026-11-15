import { fireEvent, screen } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasCategoryCard } from './DuasCategoryCard';

// Fixture text only: no dua is written here.
const PREVIEW = 'FIXTURE preview 1 — not a dua';

describe('DuasCategoryCard', () => {
  describe('hisn variant', () => {
    it('shows the preview in the Amiri list size, clamped to two lines, with the position', async () => {
      await renderUi(<DuasCategoryCard kind="hisn" number={2} onPress={jest.fn()} preview={PREVIEW} />);

      const preview = screen.getByText(PREVIEW);
      expect(preview.props.numberOfLines).toBe(2);
      expect(flatStyle(preview.props.style)).toMatchObject({ fontSize: 19, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' });
      expect(screen.getByTestId('duas-category-card-number', { includeHiddenElements: true })).toHaveTextContent('٢');
    });

    it('labels the card with the position and the preview, as one button', async () => {
      await renderUi(<DuasCategoryCard kind="hisn" number={1} onPress={jest.fn()} preview={PREVIEW} />);

      expect(screen.getByRole('button', { name: `١، ${PREVIEW}` })).toBeOnTheScreen();
    });

    it('labels the card with the position alone when there is no preview', async () => {
      await renderUi(<DuasCategoryCard kind="hisn" number={1} onPress={jest.fn()} preview={null} />);

      expect(screen.queryByText(PREVIEW)).toBeNull();
      expect(screen.getByRole('button', { name: '١' })).toBeOnTheScreen();
    });

    it('shows no chapter title, source caption or chevron', async () => {
      await renderUi(<DuasCategoryCard kind="hisn" number={1} onPress={jest.fn()} preview={PREVIEW} />);

      expect(screen.queryByText(/حصن المسلم|Hisn|المصادر|HadeethEnc/)).toBeNull();
      expect(screen.queryByTestId('duas-category-card-chevron')).toBeNull();
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      await renderUi(<DuasCategoryCard kind="hisn" number={1} onPress={onPress} preview={PREVIEW} />);

      await fireEvent.press(screen.getByRole('button', { name: `١، ${PREVIEW}` }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('labels the card in English with a comma', async () => {
      await renderUi(<DuasCategoryCard kind="hisn" number={3} onPress={jest.fn()} preview={PREVIEW} />, { locale: 'en' });

      expect(screen.getByRole('button', { name: `3, ${PREVIEW}` })).toBeOnTheScreen();
    });
  });

  describe('hadith variant', () => {
    it('shows the preview clamped to two lines, and no source line', async () => {
      await renderUi(<DuasCategoryCard kind="hadith" number={4} onPress={jest.fn()} preview={PREVIEW} />);

      const preview = screen.getByText(PREVIEW);
      expect(preview.props.numberOfLines).toBe(2);
      expect(screen.queryByText(/HadeethEnc|المصادر/)).toBeNull();
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
    it('shows the reference as the text in the UI font, and no Quran text', async () => {
      await renderUi(<DuasCategoryCard kind="quran" number={1} onPress={jest.fn()} reference="FIXTURE surah · 1" />);

      const reference = screen.getByTestId('duas-category-card-reference');
      expect(reference).toHaveTextContent('FIXTURE surah · 1');
      expect(reference.props.numberOfLines).toBe(2);
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
