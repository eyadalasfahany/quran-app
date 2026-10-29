import { AccessibilityInfo, Text } from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { FULL_SHEET_RADIUS, SHEET_MARGIN, SHEET_RADIUS } from '../form-sheet';
import { GRABBER_TOP, SheetFrame } from './SheetFrame';
import { SheetContext, type SheetContextValue } from './sheet-context';

/**
 * A sheet context for a frame rendered on its own. The frame only reads the detent actions, so the
 * gesture and scroll offset are placeholders.
 */
function sheetWith(overrides: Partial<SheetContextValue> = {}): SheetContextValue {
  return {
    close: jest.fn(),
    collapse: jest.fn(),
    detent: 'mid',
    expand: jest.fn(),
    panGesture: {} as PanGesture,
    scrollOffset: { value: 0 } as SharedValue<number>,
    scrollTouched: { value: false } as SharedValue<boolean>,
    ...overrides,
  };
}

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

  it('keeps the grabber area out of the accessibility tree outside a sheet', async () => {
    const view = await renderUi(
      <SheetFrame testID="sheet-frame">
        <Text>إعدادات</Text>
      </SheetFrame>,
    );

    expect(view.getByTestId('sheet-frame-grabber-area').props.accessibilityRole).toBeUndefined();
    expect(view.getByTestId('sheet-frame-grabber-area').props.accessibilityActions).toBeUndefined();
  });

  describe('inside a sheet', () => {
    it.each(locales)('makes the grabber a button labelled in %s', async (locale) => {
      const view = await renderUi(
        <SheetContext.Provider value={sheetWith()}>
          <SheetFrame testID="sheet-frame">
            <Text>إعدادات</Text>
          </SheetFrame>
        </SheetContext.Provider>,
        { locale },
      );

      const grabber = view.getByTestId('sheet-frame-grabber-area');
      expect(grabber.props.accessibilityRole).toBe('button');
      expect(grabber.props.accessibilityLabel).toBe(locale === 'ar' ? 'مقبض اللوحة' : 'Sheet handle');
      expect(grabber.props.accessibilityActions).toEqual([
        { label: locale === 'ar' ? 'توسيع' : 'Expand', name: 'expand' },
        { label: locale === 'ar' ? 'تصغير' : 'Collapse', name: 'collapse' },
      ]);
    });

    it('expands the sheet and announces the full detent', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
      const sheet = sheetWith();
      try {
        const view = await renderUi(
          <SheetContext.Provider value={sheet}>
            <SheetFrame testID="sheet-frame">
              <Text>إعدادات</Text>
            </SheetFrame>
          </SheetContext.Provider>,
          { locale: 'en' },
        );

        view.getByTestId('sheet-frame-grabber-area').props.onAccessibilityAction({ nativeEvent: { actionName: 'expand' } });

        expect(sheet.expand).toHaveBeenCalledTimes(1);
        expect(sheet.collapse).not.toHaveBeenCalled();
        expect(announce).toHaveBeenCalledWith('Full screen');
      } finally {
        announce.mockRestore();
      }
    });

    it('collapses the sheet and announces the mid detent', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
      const sheet = sheetWith();
      try {
        const view = await renderUi(
          <SheetContext.Provider value={sheet}>
            <SheetFrame testID="sheet-frame">
              <Text>إعدادات</Text>
            </SheetFrame>
          </SheetContext.Provider>,
          { locale: 'ar' },
        );

        view.getByTestId('sheet-frame-grabber-area').props.onAccessibilityAction({ nativeEvent: { actionName: 'collapse' } });

        expect(sheet.collapse).toHaveBeenCalledTimes(1);
        expect(sheet.expand).not.toHaveBeenCalled();
        expect(announce).toHaveBeenCalledWith('نصف الشاشة');
      } finally {
        announce.mockRestore();
      }
    });

    it('leaves the grabber visuals as they are', async () => {
      const view = await renderUi(
        <SheetContext.Provider value={sheetWith()}>
          <SheetFrame testID="sheet-frame">
            <Text>إعدادات</Text>
          </SheetFrame>
        </SheetContext.Provider>,
      );

      expect(flatStyle(view.getByTestId('sheet-frame-grabber').props.style)).toMatchObject({
        height: 5,
        width: themes.light.size.grabberWidth,
      });
    });
  });
});
