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

  it('prefers the text preview over the Quran reference', async () => {
    await renderUi(<AzkarItemCard number={1} onPress={jest.fn()} preview={PREVIEW} quranReference="سورة البقرة · ٢٥٥" requiredCount={null} />);

    expect(screen.getByText(PREVIEW)).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-item-card-quran-reference')).toBeNull();
  });

  it('shows the Quran reference in English too', async () => {
    await renderUi(
      <AzkarItemCard number={1} onPress={jest.fn()} preview={null} quranReference="Surah Al-Baqarah · 255" requiredCount={null} />,
      { locale: 'en' },
    );

    expect(screen.getByRole('button', { name: '1, Surah Al-Baqarah · 255' })).toBeOnTheScreen();
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
