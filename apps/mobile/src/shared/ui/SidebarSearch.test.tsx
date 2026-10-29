import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SidebarSearch } from './SidebarSearch';

const theme = themes.light;
const labels = {
  ar: 'ابحث في القرآن',
  en: 'Search the Quran',
} as const;

function field(onPress: () => void = () => undefined) {
  return <SidebarSearch label={labels.ar} onPress={onPress} testID="sidebar-search" />;
}

describe('SidebarSearch', () => {
  it('renders the label as a button named by it', async () => {
    const view = await renderUi(field());

    expect(view.getByText(labels.ar)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: labels.ar })).toBeOnTheScreen();
    expect(view.getByTestId('sidebar-search').props.accessibilityLabel).toBe(labels.ar);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(field(onPress));

    await fireEvent.press(view.getByRole('button', { name: labels.ar }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a pill-shaped raised field with a hairline line border and a 44 pt minimum height', async () => {
    const view = await renderUi(field());
    const style = flatStyle(view.getByTestId('sidebar-search').props.style);

    expect(style).toMatchObject({
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.line,
      borderRadius: theme.radius.pill,
      borderWidth: theme.stroke.hairline,
      flexDirection: 'row',
      gap: theme.space[2],
      marginBottom: theme.space[2],
      minHeight: 44,
      paddingHorizontal: theme.space[3],
    });
    expect(style.alignItems).toBe('center');
  });

  it.each(locales)('renders the label in %s', async (locale) => {
    const view = await renderUi(
      <SidebarSearch label={labels[locale]} onPress={() => undefined} testID="sidebar-search" />,
      { locale },
    );

    expect(view.getByRole('button', { name: labels[locale] })).toBeOnTheScreen();
    expect(flatStyle(view.getByText(labels[locale]).props.style)).toMatchObject({ color: theme.colors.inkMuted });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SidebarSearch.tsx')).toEqual([]);
  });
});
