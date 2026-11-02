import { FlexWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, column, grow, label, row } from './primitives';
import { widgetPaths } from '../snapshot/deep-links';
import type { WidgetAzkarSession } from '../snapshot/types';

/** One session: a check or an empty ring, its title, and its count for the period. */
function sessionTile(ctx: WidgetContext, session: WidgetAzkarSession) {
  const { labels, locale, palette, rtl } = ctx;
  const status = session.complete
    ? labels.complete
    : `${formatNumber(session.done, locale)} / ${formatNumber(session.total, locale)}`;
  const check = (
    <FlexWidget
      key="check"
      style={{
        alignItems: 'center',
        backgroundColor: session.complete ? palette.brand : palette.surfaceRaised,
        borderColor: palette.line,
        borderRadius: 11,
        borderWidth: session.complete ? 0 : 1.5,
        height: 22,
        justifyContent: 'center',
        width: 22,
      }}
    >
      {session.complete
        ? label('✓', { align: 'center', color: palette.onBrand, font: WIDGET_FONTS.bold, size: 12 }, rtl)
        : null}
    </FlexWidget>
  );
  return grow(
    column(
      [
        check,
        label(session.title, { align: 'center', color: palette.ink, font: WIDGET_FONTS.medium, size: 12 }, rtl),
        label(status, { align: 'center', color: palette.inkMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl),
      ],
      { alignItems: 'center', paddingHorizontal: 2 },
    ),
    { alignItems: 'center' },
  );
}

/**
 * The 4×2 Azkar status widget (ADR 0035 §2, ADR 0042): the five sessions, done or not. Without Azkar content in the
 * snapshot it shows the open-the-app state, and it never shows dhikr text (ADR 0035 §1.2).
 */
export function AzkarWidget(ctx: WidgetContext) {
  const { labels, palette, rtl, snapshot } = ctx;
  const click = openPath(ctx, widgetPaths.azkar);

  if (snapshot.azkar === null) {
    return card(ctx, [
      label(labels.azkarTitle, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      label(labels.azkarEmpty, { color: palette.ink, font: WIDGET_FONTS.regular, maxLines: 2, size: 14 }, rtl),
    ], { accessibilityLabel: `${labels.azkarTitle}: ${labels.azkarEmpty}`, click });
  }

  const sessions = snapshot.azkar.sessions;
  const summary = sessions.filter((session) => session.complete).length;
  return card(ctx, [
    label(labels.azkarTitle, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
    block({ height: 8 }),
    row(
      sessions.map((session) => sessionTile(ctx, session)),
      rtl,
    ),
  ], {
    accessibilityLabel: `${labels.azkarTitle}: ${formatNumber(summary, ctx.locale)} / ${formatNumber(sessions.length, ctx.locale)}`,
    click,
  });
}
