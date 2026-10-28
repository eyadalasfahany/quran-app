import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { ReadingAyahHeader } from './ReadingAyahHeader';

describe('ReadingAyahHeader', () => {
  it.each(locales)('shows the mark, then play, tafsir and more with their labels (%s)', async (locale) => {
    const view = await renderUi(
      <ReadingAyahHeader onOpenActions={() => undefined} onOpenTafsir={() => undefined} verseNumber={5} />,
      { locale },
    );

    expect(view.getByLabelText(locale === 'ar' ? 'الآية ٥' : 'Ayah 5')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'تشغيل الآية' : 'Play ayah' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'التفسير' : 'Tafsir' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'المزيد' : 'More' })).toBeOnTheScreen();
  });

  it('disables play until recitation is available, with the unavailable hint', async () => {
    const view = await renderUi(<ReadingAyahHeader onOpenActions={() => undefined} verseNumber={1} />);
    const play = view.getByRole('button', { name: 'تشغيل الآية' });

    expect(play.props.accessibilityState).toMatchObject({ disabled: true });
    expect(play.props.accessibilityHint).toBe('التلاوة غير متاحة بعد');
  });

  it('opens tafsir and ayah actions from their buttons', async () => {
    const onOpenTafsir = jest.fn();
    const onOpenActions = jest.fn();
    const view = await renderUi(
      <ReadingAyahHeader onOpenActions={onOpenActions} onOpenTafsir={onOpenTafsir} verseNumber={1} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'التفسير' }));
    await fireEvent.press(view.getByRole('button', { name: 'المزيد' }));
    await fireEvent.press(view.getByLabelText('الآية ١'));

    expect(onOpenTafsir).toHaveBeenCalledTimes(1);
    expect(onOpenActions).toHaveBeenCalledTimes(2);
  });

  it('disables tafsir when no handler is given', async () => {
    const view = await renderUi(<ReadingAyahHeader verseNumber={1} />);

    expect(view.getByRole('button', { name: 'التفسير' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('marks the mark selected when the ayah is active', async () => {
    const view = await renderUi(
      <ReadingAyahHeader active onOpenActions={() => undefined} testID="header" verseNumber={1} />,
    );

    expect(view.getByTestId('header-marker').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ReadingAyahHeader.tsx')).toEqual([]);
  });
});
