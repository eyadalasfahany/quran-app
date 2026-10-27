import { Text } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { FULL_SHEET_RADIUS, SHEET_MARGIN, SHEET_RADIUS } from '../form-sheet';
import { SheetFrame } from './SheetFrame';

describe('SheetFrame', () => {
  it('insets the card like the phone frames and rounds every corner', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات القراءة</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame').props.style)).toMatchObject({
      paddingBottom: SHEET_MARGIN,
      paddingHorizontal: SHEET_MARGIN,
    });
    expect(flatStyle(view.getByTestId('sheet-frame-card').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      borderRadius: SHEET_RADIUS,
    });
    expect(view.getByText('إعدادات القراءة')).toBeOnTheScreen();
  });

  it('draws the grabber from the size and opacity tokens', async () => {
    const { size, opacity, colors } = themes.light;
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame-grabber').props.style)).toMatchObject({
      backgroundColor: colors.inkMuted,
      height: size.grabberHeight,
      opacity: opacity.grabber,
      width: size.grabberWidth,
    });
  });

  it('uses the raised surface in the dark theme', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
      { theme: 'dark' },
    );

    expect(flatStyle(view.getByTestId('sheet-frame-card').props.style).backgroundColor).toBe(
      themes.dark.colors.surfaceRaised,
    );
  });

  it.each(locales)('keeps the same symmetric inset in %s', async (locale) => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>{locale}</Text>
      </SheetFrame>,
      { locale },
    );

    expect(flatStyle(view.getByTestId('sheet-frame').props.style).paddingHorizontal).toBe(SHEET_MARGIN);
    expect(view.getByText(locale)).toBeOnTheScreen();
  });

  it('keeps the grabber out of the accessibility tree as a plain view', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
    );

    expect(view.getByTestId('sheet-frame-grabber').props.accessibilityRole).toBeUndefined();
    expect(view.getByTestId('sheet-frame-grabber').props.accessibilityLabel).toBeUndefined();
  });

  it('draws the full-width sheet edge to edge with rounded top corners only', async () => {
    const view = await renderUi(
      <SheetFrame shape="full" testID="sheet-frame">
        <Text>التفسير</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame').props.style)).toMatchObject({ paddingBottom: 0, paddingHorizontal: 0 });
    const card = flatStyle(view.getByTestId('sheet-frame-card').props.style);
    expect(card).toMatchObject({ borderTopLeftRadius: FULL_SHEET_RADIUS, borderTopRightRadius: FULL_SHEET_RADIUS });
    expect(card.borderRadius).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetFrame.tsx')).toEqual([]);
  });
});
