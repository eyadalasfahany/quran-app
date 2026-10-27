import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { FocusAyah } from './FocusAyah';

const baseProps = {
  blockHeight: 640,
  onPress: () => undefined,
  testID: 'focus',
  textImlaei: 'الحمد لله',
  textUthmani: 'ٱلْحَمْدُ لِلَّهِ',
  verseNumber: 2,
} as const;

describe('FocusAyah', () => {
  it.each(locales)('centres one ayah in a screen-height block (%s)', async (locale) => {
    const view = await renderUi(
      <FocusAyah
        blockHeight={640}
        onPress={() => undefined}
        testID="focus"
        textImlaei="الحمد لله"
        textUthmani="ٱلْحَمْدُ لِلَّهِ"
        verseNumber={2}
      />,
      { locale },
    );

    expect(flatStyle(view.getByTestId('focus').props.style).height).toBe(640);
    expect(view.getByText('ٱلْحَمْدُ لِلَّهِ')).toBeOnTheScreen();
  });

  it.each(locales)('labels the ayah with Imla\'i text and the ayah number (%s)', async (locale) => {
    const view = await renderUi(<FocusAyah {...baseProps} />, { locale });

    const label =
      locale === 'ar' ? 'الحمد لله الآية ٢' : 'الحمد لله Ayah 2';
    expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
  });

  it('marks the selected state for screen readers', async () => {
    const view = await renderUi(<FocusAyah {...baseProps} selected />);

    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/FocusAyah.tsx')).toEqual([]);
  });
});
