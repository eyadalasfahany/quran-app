import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarItemCard } from './AzkarItemCard';

const PREVIEW = 'نص تجريبي 1 — ليس ذكرًا';

describe('AzkarItemCard', () => {
  it('shows the medallion number and the preview, labelled as one button', async () => {
    await renderUi(<AzkarItemCard number={2} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);

    expect(screen.getByText(PREVIEW)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `٢, ${PREVIEW}` })).toBeOnTheScreen();
  });

  it('shows the Quran reference in the UI font when there is no preview, and labels the card with it', async () => {
    await renderUi(
      <AzkarItemCard number={1} onPress={jest.fn()} preview={null} quranReference="سورة البقرة · ٢٥٥" requiredCount={null} />,
    );

    expect(screen.getByTestId('azkar-item-card-quran-reference')).toHaveTextContent('سورة البقرة · ٢٥٥');
    expect(screen.getByRole('button', { name: '١, سورة البقرة · ٢٥٥' })).toBeOnTheScreen();
  });

  it('shows the preview and the Quran reference under it, as one muted line', async () => {
    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} quranReference="سورة البقرة · ٢٥٥" requiredCount={null} />);

    expect(screen.getByText(PREVIEW)).toBeOnTheScreen();
    const reference = screen.getByTestId('azkar-item-card-quran-reference');
    expect(reference).toHaveTextContent('سورة البقرة · ٢٥٥');
    expect(flatStyle(reference.props.style)).toMatchObject({ color: expect.any(String) });
    expect(reference.props.numberOfLines).toBe(1);
  });

  it('labels the card with the preview first, then the reference, when both exist', async () => {
    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} quranReference="سورة البقرة · ٢٥٥" requiredCount={null} />);

    expect(screen.getByRole('button', { name: `١, ${PREVIEW}, سورة البقرة · ٢٥٥` })).toBeOnTheScreen();
  });

  it('shows the Quran reference in English too', async () => {
    await renderUi(
      <AzkarItemCard number={1} onPress={jest.fn()} preview={null} quranReference="Surah Al-Baqarah · 255" requiredCount={null} />,
      { locale: 'en' },
    );

    expect(screen.getByRole('button', { name: '1, Surah Al-Baqarah · 255' })).toBeOnTheScreen();
  });

  it('shows the preview and the reference together in English, the preview right-aligned', async () => {
    await renderUi(
      <AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} quranReference="Surah Al-Baqarah · 255" requiredCount={null} />,
      { locale: 'en' },
    );

    expect(screen.getByRole('button', { name: `1, ${PREVIEW}, Surah Al-Baqarah · 255` })).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-item-card-quran-reference')).toHaveTextContent('Surah Al-Baqarah · 255');
    expect(flatStyle(screen.getByText(PREVIEW).props.style)).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('shows the count chip only when the count is sourced', async () => {
    const view = await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={3} />);
    expect(view.getByTestId('azkar-count-chip')).toBeOnTheScreen();
    await view.unmount();

    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);
    expect(screen.queryByTestId('azkar-count-chip')).toBeNull();
  });

  it('shows the completed mark and says so in its label', async () => {
    await renderUi(<AzkarItemCard done number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);

    expect(screen.getByTestId('azkar-item-card-done', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `١, ${PREVIEW}, مكتمل` })).toBeOnTheScreen();
  });

  it('renders a custom action in place of the chip and the mark', async () => {
    await renderUi(
      <AzkarItemCard action={<Text>favourite</Text>} done number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={3} />,
    );

    expect(screen.getByText('favourite')).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-count-chip')).toBeNull();
    expect(screen.queryByTestId('azkar-item-card-done')).toBeNull();
  });

  it('opens the card on press', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarItemCard number={1} onPress={onPress} preview={PREVIEW} requiredCount={null} />);

    await press(screen.getByRole('button', { name: `١, ${PREVIEW}` }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English number and label', async () => {
    await renderUi(<AzkarItemCard label="Entry 4" number={4} onPress={jest.fn()} preview={null} requiredCount={null} />, {
      locale: 'en',
    });

    expect(screen.getByRole('button', { name: 'Entry 4' })).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-item-card-medallion', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('keeps the Arabic preview right-aligned and RTL in English', async () => {
    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />, {
      locale: 'en',
    });

    expect(flatStyle(screen.getByText(PREVIEW).props.style)).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarItemCard.tsx')).toEqual([]);
  });
});

describe('AzkarItemCard favourites anatomy', () => {
  const QURAN_TEXT = 'FIXTURE verse text — not Quran';

  it('clamps the preview to two lines with a tail ellipsis', async () => {
    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);

    expect(screen.getByText(PREVIEW).props.numberOfLines).toBe(2);
    expect(screen.getByText(PREVIEW).props.ellipsizeMode).toBe('tail');
  });

  it('draws the round gold ring when the badge is ring, and the star medallion otherwise', async () => {
    const view = await renderUi(<AzkarItemCard badge="ring" number={3} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);
    expect(view.getByText('٣', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('azkar-item-card-medallion', { includeHiddenElements: true }).props.style)).toMatchObject({
      borderRadius: 18,
      height: 36,
      width: 36,
    });
    await view.unmount();

    await renderUi(<AzkarItemCard number={3} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);
    expect(flatStyle(screen.getByTestId('azkar-item-card-medallion', { includeHiddenElements: true }).props.style)).toMatchObject({
      height: 38,
      width: 38,
    });
  });

  it('shows the Quran text in the Quran face, never clamped, under the preview', async () => {
    await renderUi(
      <AzkarItemCard number={1} onPress={jest.fn()} preview={null} quranReference="سورة البقرة · ١٢٨" quranText={QURAN_TEXT} requiredCount={null} />,
    );

    const text = screen.getByTestId('azkar-item-card-quran-text');
    expect(text).toHaveTextContent(QURAN_TEXT);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.ellipsizeMode).toBeUndefined();
  });

  it('keeps the reference as a one-line muted caption under the Quran text', async () => {
    await renderUi(
      <AzkarItemCard number={1} onPress={jest.fn()} preview={null} quranReference="سورة البقرة · ١٢٨" quranText={QURAN_TEXT} requiredCount={null} />,
    );

    const reference = screen.getByTestId('azkar-item-card-quran-reference');
    expect(reference).toHaveTextContent('سورة البقرة · ١٢٨');
    expect(reference.props.numberOfLines).toBe(1);
  });

  it('labels the card with the Quran text and then the reference', async () => {
    await renderUi(
      <AzkarItemCard number={2} onPress={jest.fn()} preview={null} quranReference="سورة البقرة · ١٢٩" quranText={QURAN_TEXT} requiredCount={null} />,
    );

    expect(screen.getByRole('button', { name: `٢, ${QURAN_TEXT}, سورة البقرة · ١٢٩` })).toBeOnTheScreen();
  });

  it('shows the muted category line under the card text, and labels the card with it', async () => {
    await renderUi(<AzkarItemCard badge="ring" category="أذكار الصباح" number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);

    const category = screen.getByTestId('azkar-item-card-category');
    expect(category).toHaveTextContent('أذكار الصباح');
    expect(category.props.numberOfLines).toBe(1);
    expect(screen.getByRole('button', { name: `١, ${PREVIEW}, أذكار الصباح` })).toBeOnTheScreen();
  });

  it('draws no category line when none is given', async () => {
    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} requiredCount={null} />);

    expect(screen.queryByTestId('azkar-item-card-category')).toBeNull();
  });
});
