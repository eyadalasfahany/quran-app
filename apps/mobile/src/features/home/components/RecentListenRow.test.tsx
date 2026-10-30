import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { RecentListenRow } from './RecentListenRow';

const colors = themes.light.colors;
const props = {
  letter: 'ع',
  name: 'مشاري راشد العفاسي',
  playLabel: 'تشغيل سورة الكهف',
  subtitle: 'سورة الكهف · مرتّل',
  onPlay: () => undefined,
};

describe('RecentListenRow', () => {
  it('draws the pause glyph on its button while the listen plays', async () => {
    const view = await renderUi(<RecentListenRow {...props} filled={false} playing />);

    expect(JSON.stringify(view.toJSON())).toContain('M6 5h4v14H6zM14 5h4v14h-4z');
  });

  it('draws the reciter tile at 48 pt with a 14 pt radius and an Amiri letter in brand', async () => {
    const view = await renderUi(<RecentListenRow {...props} filled={false} testID="row" />);
    const letter = view.getByText('ع', { includeHiddenElements: true });

    expect(flatStyle(letter.props.style)).toMatchObject({ color: colors.brand, fontFamily: 'Amiri-Bold', fontSize: 22 });
    expect(flatStyle(view.getByTestId('row-tile', { includeHiddenElements: true }).props.style)).toMatchObject({
      backgroundColor: colors.fillSecondary,
      borderRadius: 14,
      height: 48,
      width: 48,
    });
  });

  it('sets the reciter name at 17 and the subtitle at 13, muted', async () => {
    const view = await renderUi(<RecentListenRow {...props} filled={false} />);

    expect(flatStyle(view.getByText('مشاري راشد العفاسي').props.style)).toMatchObject({
      color: colors.ink,
      fontFamily: 'IBMPlexSansArabic-SemiBold',
      fontSize: 17,
    });
    expect(flatStyle(view.getByText('سورة الكهف · مرتّل').props.style)).toMatchObject({
      color: colors.inkMuted,
      fontFamily: 'IBMPlexSansArabic-Regular',
      fontSize: 13,
    });
  });

  it('fills the first row’s play button and outlines the others', async () => {
    const first = await renderUi(<RecentListenRow {...props} filled />);
    const other = await renderUi(<RecentListenRow {...props} filled={false} />);

    expect(flatStyle(first.getByRole('button', { name: 'تشغيل سورة الكهف' }).props.style).backgroundColor).toBe(colors.brand);
    expect(flatStyle(other.getByRole('button', { name: 'تشغيل سورة الكهف' }).props.style).backgroundColor).toBe(
      colors.surfaceRaised,
    );
  });

  it('calls onPlay when its play button is pressed', async () => {
    const onPlay = jest.fn();
    const view = await renderUi(<RecentListenRow {...props} filled onPlay={onPlay} />);

    await fireEvent.press(view.getByRole('button', { name: 'تشغيل سورة الكهف' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('is one labelled group for the reciter and surah, and hides the decorative tile', async () => {
    const view = await renderUi(<RecentListenRow {...props} filled={false} testID="row" />);

    expect(view.getByLabelText('مشاري راشد العفاسي, سورة الكهف · مرتّل')).toBeOnTheScreen();
    expect(view.getByTestId('row-tile', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it.each(locales)('renders its texts in %s', async (locale) => {
    const view = await renderUi(
      <RecentListenRow
        filled
        letter="A"
        name="Mishari Rashid Al-Afasy"
        onPlay={() => undefined}
        playLabel="Play Surah Al-Kahf"
        subtitle="Surah Al-Kahf · Murattal"
      />,
      { locale },
    );

    expect(view.getByText('Mishari Rashid Al-Afasy')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Play Surah Al-Kahf' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/RecentListenRow.tsx')).toEqual([]);
  });
});
