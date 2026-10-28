import { size } from '@quran/design-tokens';
import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SheetHeader } from './SheetHeader';

describe('SheetHeader', () => {
  it('renders a large header title with a close button', async () => {
    const onClose = jest.fn();
    const view = await renderUi(
      <SheetHeader closeLabel="إغلاق" onClose={onClose} testID="header" title="إعدادات القراءة" />,
    );

    expect(view.getByRole('header', { name: 'إعدادات القراءة' })).toBeOnTheScreen();
    expect(flatStyle(view.getByText('إعدادات القراءة').props.style)).toMatchObject(themes.light.text.title);

    await fireEvent.press(view.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the compact size with a muted subtitle', async () => {
    const view = await renderUi(
      <SheetHeader size="compact" subtitle="صفحة ١ · الجزء ١" testID="header" title="الفاتحة · الآية ٢" />,
    );

    expect(flatStyle(view.getByText('الفاتحة · الآية ٢').props.style)).toMatchObject(themes.light.text.headline);
    expect(flatStyle(view.getByTestId('header-subtitle').props.style)).toMatchObject({
      color: themes.light.colors.inkMuted,
      fontSize: 12,
    });
  });

  it('draws the close button on fillSecondary by default', async () => {
    const view = await renderUi(<SheetHeader closeLabel="Close" onClose={() => undefined} title="title" />);

    expect(flatStyle(view.getByRole('button', { name: 'Close' }).props.style).backgroundColor).toBe(
      themes.light.colors.fillSecondary,
    );
  });

  it('draws the close button on fillTrack when closeTone is track', async () => {
    const view = await renderUi(
      <SheetHeader closeLabel="Close" closeTone="track" onClose={() => undefined} title="title" />,
    );
    const close = view.getByRole('button', { name: 'Close' });

    expect(flatStyle(close.props.style).backgroundColor).toBe(themes.light.colors.fillTrack);
    expect(flatStyle(close.props.style)).toMatchObject({ height: 44, width: 44 });
  });

  it('draws the close glyph at the 12 pt closeGlyph token, not the 22 pt icon default', async () => {
    const view = await renderUi(
      <SheetHeader closeLabel="Close" onClose={() => undefined} testID="header" title="title" />,
    );

    expect(size.closeGlyph).toBe(12);
    expect(flatStyle(view.getByTestId('header-close-icon', { includeHiddenElements: true }).props.style)).toMatchObject({
      height: size.closeGlyph,
      width: size.closeGlyph,
    });
  });

  it('has no close button without a handler', async () => {
    const view = await renderUi(<SheetHeader title="title" />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<SheetHeader closeLabel="Close" onClose={() => undefined} title="title" />, { locale });

    expect(view.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SheetHeader.tsx')).toEqual([]);
  });
});
