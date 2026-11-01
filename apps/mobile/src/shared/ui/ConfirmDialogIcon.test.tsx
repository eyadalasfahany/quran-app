import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { CONFIRM_ICON_SIZE, ConfirmDialogIcon } from './ConfirmDialogIcon';

const reset = { ios: 'arrow.counterclockwise', android: 'restart_alt' } as const;
// The badge and its glyph are hidden from screen readers, so queries have to opt in to see them.
const hidden = { includeHiddenElements: true } as const;

describe('ConfirmDialogIcon', () => {
  it('draws a 52 pt circle', async () => {
    const view = await renderUi(<ConfirmDialogIcon icon={reset} testID="badge" tone="brand" />);

    expect(flatStyle(view.getByTestId('badge', hidden).props.style)).toMatchObject({
      borderRadius: themes.light.radius.pill,
      height: CONFIRM_ICON_SIZE,
      width: CONFIRM_ICON_SIZE,
    });
    expect(CONFIRM_ICON_SIZE).toBe(52);
  });

  it('tints the badge with the brand colour for a plain dialog', async () => {
    const view = await renderUi(<ConfirmDialogIcon icon={reset} testID="badge" tone="brand" />, { locale: 'en' });

    expect(flatStyle(view.getByTestId('badge-tint', hidden).props.style).backgroundColor).toBe(themes.light.colors.brand);
  });

  it('tints the badge with the danger colour for a destructive dialog', async () => {
    const view = await renderUi(<ConfirmDialogIcon icon={reset} testID="badge" tone="destructive" />, { locale: 'en' });

    expect(flatStyle(view.getByTestId('badge-tint', hidden).props.style).backgroundColor).toBe(themes.light.colors.danger);
  });

  it('keeps the tint translucent so the badge reads as a tint, not a solid disc', async () => {
    const view = await renderUi(<ConfirmDialogIcon icon={reset} testID="badge" tone="destructive" />, { locale: 'en' });

    expect(flatStyle(view.getByTestId('badge-tint', hidden).props.style).opacity).toBeLessThan(0.5);
  });

  it.each(locales)('takes the dark theme colours in %s', async (locale) => {
    const view = await renderUi(<ConfirmDialogIcon icon={reset} testID="badge" tone="destructive" />, {
      locale,
      theme: 'dark',
    });

    expect(flatStyle(view.getByTestId('badge-tint', hidden).props.style).backgroundColor).toBe(themes.dark.colors.danger);
  });

  it('is hidden from screen readers, since the dialog title carries the meaning', async () => {
    const view = await renderUi(<ConfirmDialogIcon icon={reset} testID="badge" tone="brand" />, { locale: 'en' });
    const badge = view.getByTestId('badge', hidden);

    expect(badge.props.accessibilityElementsHidden).toBe(true);
    expect(badge.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ConfirmDialogIcon.tsx')).toEqual([]);
  });
});
