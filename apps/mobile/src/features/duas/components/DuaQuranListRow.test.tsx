import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuaQuranListRow } from './DuaQuranListRow';

const VERSE = 'FIXTURE VERSE 1:1 — not a dua, kept whole without any line limit';

describe('DuaQuranListRow', () => {
  it('shows the full verse text and the ayah label', async () => {
    await renderUi(<DuaQuranListRow ayahLabel="الآية ١" onPress={jest.fn()} surahName="FIXTURE surah ar" text={VERSE} />);
    expect(screen.getByText(VERSE)).toBeOnTheScreen();
    expect(screen.getByText('الآية ١')).toBeOnTheScreen();
  });

  it('is a button named by the surah and the ayah label, not the verse', async () => {
    await renderUi(<DuaQuranListRow ayahLabel="الآية ١" onPress={jest.fn()} surahName="FIXTURE surah ar" text={VERSE} />);
    const row = screen.getByRole('button', { name: 'FIXTURE surah ar، الآية ١' });
    expect(row).toBeOnTheScreen();
    expect(row.props.accessibilityLabel).not.toContain(VERSE);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<DuaQuranListRow ayahLabel="الآية ١" onPress={onPress} surahName="FIXTURE surah ar" text={VERSE} />);
    await press(screen.getByRole('button', { name: 'FIXTURE surah ar، الآية ١' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not truncate the verse text', async () => {
    await renderUi(<DuaQuranListRow ayahLabel="الآية ١" onPress={jest.fn()} surahName="FIXTURE surah ar" text={VERSE} />);
    expect(screen.getByText(VERSE).props.numberOfLines).toBeUndefined();
  });

  it('uses the English label order in English', async () => {
    await renderUi(<DuaQuranListRow ayahLabel="Ayah 1" onPress={jest.fn()} surahName="FIXTURE surah en" text={VERSE} />, {
      locale: 'en',
    });
    expect(screen.getByRole('button', { name: 'FIXTURE surah en, Ayah 1' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuaQuranListRow.tsx')).toEqual([]);
  });
});
