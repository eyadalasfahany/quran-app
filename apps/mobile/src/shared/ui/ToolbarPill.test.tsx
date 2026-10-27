import { fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { IconButton } from './IconButton';
import { ToolbarPill } from './ToolbarPill';

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => false,
}));

const bookmark = { ios: 'bookmark', android: 'bookmark' } as const;
const settings = { ios: 'slider.horizontal.3', android: 'tune' } as const;

function pill(onBookmark = () => undefined) {
  return (
    <ToolbarPill label="أدوات الصفحة" testID="pill">
      <IconButton icon={bookmark} label="حفظ الصفحة" onPress={onBookmark} />
      <IconButton icon={settings} label="إعدادات القراءة" onPress={() => undefined} />
    </ToolbarPill>
  );
}

describe('ToolbarPill', () => {
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
  });

  it('groups its buttons in one labelled toolbar', async () => {
    const view = await renderUi(pill());

    expect(view.getByTestId('pill').props).toMatchObject({
      accessibilityLabel: 'أدوات الصفحة',
      accessibilityRole: 'toolbar',
    });
    expect(view.getAllByRole('button')).toHaveLength(2);
  });

  it('is a glass pill laid out in a row', async () => {
    const view = await renderUi(pill());

    expect(flatStyle(view.getByTestId('pill').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.glassFallback,
      borderRadius: themes.light.radius.pill,
      flexDirection: 'row',
    });
  });

  it('passes presses to its buttons', async () => {
    const onBookmark = jest.fn();
    const view = await renderUi(pill(onBookmark));

    await fireEvent.press(view.getByRole('button', { name: 'حفظ الصفحة' }));

    expect(onBookmark).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('uses a logical row, so the order mirrors in RTL (%s)', async (locale) => {
    const view = await renderUi(pill(), { locale });

    expect(flatStyle(view.getByTestId('pill').props.style).flexDirection).toBe('row');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ToolbarPill.tsx')).toEqual([]);
  });
});
