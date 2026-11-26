import { fireEvent } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { locales, renderUi } from '../../../../jest/render-ui';
import { RiwayahAyahUnavailable } from './RiwayahAyahUnavailable';

describe('RiwayahAyahUnavailable', () => {
  it('names the ayah with its own riwayah number and the riwayah, then the note (Arabic)', async () => {
    const view = await renderUi(<RiwayahAyahUnavailable riwayah="warsh" surahName="البقرة" verseNumber={5} />);

    expect(view.getByRole('header', { name: 'البقرة · الآية ٥' })).toBeOnTheScreen();
    expect(view.getByText('ورش عن نافع')).toBeOnTheScreen();
    expect(view.getByTestId('riwayah-ayah-unavailable-note')).toHaveTextContent('أدوات الآية غير متاحة بعد في هذه الرواية.');
  });

  it('uses Western digits and English copy in English, keeping the Arabic surah name', async () => {
    const view = await renderUi(<RiwayahAyahUnavailable riwayah="qalun" surahName="البقرة" verseNumber={5} />, {
      locale: 'en',
    });

    expect(view.getByRole('header', { name: 'البقرة · Ayah 5' })).toBeOnTheScreen();
    expect(view.getByTestId('riwayah-ayah-unavailable-note')).toHaveTextContent(
      'Ayah actions aren’t available yet in this riwayah.',
    );
  });

  it.each(locales)('closes from a labelled button in %s, and shows no actions', async (locale) => {
    const onClose = jest.fn();
    const view = await renderUi(
      <RiwayahAyahUnavailable onClose={onClose} riwayah="warsh" surahName="البقرة" verseNumber={5} />,
      { locale },
    );

    fireEvent.press(view.getByRole('button', { name: locale === 'ar' ? 'إغلاق' : 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(view.getAllByRole('button')).toHaveLength(1);
  });

  it('writes no raw colour', () => {
    const source = readFileSync(join(__dirname, 'RiwayahAyahUnavailable.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
