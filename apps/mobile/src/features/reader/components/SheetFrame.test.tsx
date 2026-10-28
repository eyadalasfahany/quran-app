import { Text } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { FULL_SHEET_RADIUS, SHEET_MARGIN, SHEET_RADIUS } from '../form-sheet';
import { GRABBER_TOP, SheetFrame } from './SheetFrame';

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

  it('draws the strong grabber by default: 40 pt, lineStrong, opaque, radius 3', async () => {
    const { size, colors } = themes.light;
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame-grabber').props.style)).toMatchObject({
      backgroundColor: colors.lineStrong,
      borderRadius: 3,
      height: 5,
      opacity: 1,
      width: size.grabberWidth,
    });
    expect(size.grabberWidth).toBe(40);
  });

  it('draws the muted grabber: 36 pt, inkMuted at 40%, radius 3', async () => {
    const { colors } = themes.light;
    const view = await renderUi(
      <SheetFrame grabber="muted" testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame-grabber').props.style)).toMatchObject({
      backgroundColor: colors.inkMuted,
      borderRadius: 3,
      height: 5,
      opacity: 0.4,
      width: 36,
    });
  });

  it('draws the compact grabber: 36 pt, lineStrong, opaque, radius 3', async () => {
    const { colors } = themes.light;
    const view = await renderUi(
      <SheetFrame grabber="compact" testID="sheet-frame">
        <Text>التفسير</Text>
      </SheetFrame>,
    );

    expect(flatStyle(view.getByTestId('sheet-frame-grabber').props.style)).toMatchObject({
      backgroundColor: colors.lineStrong,
      borderRadius: 3,
      height: 5,
      opacity: 1,
      width: 36,
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

  it('starts the grabber 10 pt from the top, as the ayah and settings frames do', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
    );

    expect(GRABBER_TOP).toBe(10);
    expect(flatStyle(view.getByTestId('sheet-frame-grabber-area').props.style).paddingTop).toBe(GRABBER_TOP);
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
