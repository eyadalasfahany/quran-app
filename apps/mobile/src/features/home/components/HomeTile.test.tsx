import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { HomeTile } from './HomeTile';

const list = { ios: 'list.bullet', android: 'format_list_bulleted' } as const;
const colors = themes.light.colors;

describe('HomeTile', () => {
  it('draws the raised tile with a line border, radius 18 and the frame padding', async () => {
    const view = await renderUi(<HomeTile icon={list} label="السور" onPress={() => undefined} testID="tile" />);
    const tile = view.getByRole('button', { name: 'السور' });

    expect(flatStyle(tile.props.style)).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
      borderRadius: 18,
      borderWidth: 1,
      flex: 1,
      gap: 8,
      paddingHorizontal: 4,
      paddingVertical: 14,
    });
  });

  it('sets the label in the 13 px Medium caption, centred, in ink', async () => {
    const view = await renderUi(<HomeTile icon={list} label="المحفوظات" onPress={() => undefined} />);
    const label = flatStyle(view.getByText('المحفوظات').props.style);

    expect(label).toMatchObject({ color: colors.ink, fontSize: 13, textAlign: 'center' });
    expect(label.fontFamily).toBe('IBMPlexSansArabic-Medium');
    expect(label.fontWeight).toBeUndefined();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<HomeTile icon={list} label="Surahs" onPress={onPress} />, { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Surahs' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes the button role and the label', async () => {
    const view = await renderUi(<HomeTile icon={list} label="Saved" onPress={() => undefined} testID="saved" />, {
      locale: 'en',
    });

    expect(view.getByRole('button', { name: 'Saved' })).toBe(view.getByTestId('saved'));
  });

  it.each(locales)('renders the label in %s', async (locale) => {
    const view = await renderUi(<HomeTile icon={list} label="label" onPress={() => undefined} />, { locale });

    expect(view.getByRole('button', { name: 'label' })).toBeOnTheScreen();
    expect(view.getByText('label')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/HomeTile.tsx')).toEqual([]);
  });
});
