'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget, OverlapWidget, SvgWidget, type ClickActionProps } from 'react-native-android-widget';
import type { ReactNode } from 'react';

import { radius } from '@quran/design-tokens';

import { cardMotifSvg } from './card-motif';
import type { WidgetContext } from './context';
import type { HexColor } from './theme';
import { withAlpha } from './theme';

/** Widget padding: 16 dp (design-system spacing step). */
const CARD_PADDING = 16;
const MOTIF_SIZE = 200;

/**
 * The card every widget draws on: design-system gradient + soft hizb-star watermark (ADR 0010 ornament), xl radius,
 * hairline border. The root is the tap target and TalkBack label (ADR 0035 §1).
 */
export function card(
  ctx: WidgetContext,
  children: ReactNode[],
  options: { background?: HexColor; click?: ClickActionProps; accessibilityLabel: string },
) {
  const { palette } = ctx;
  const solidBackground = options.background;
  const body = (
    <FlexWidget
      style={{
        flexDirection: 'column',
        height: 'match_parent',
        padding: CARD_PADDING,
        width: 'match_parent',
      }}
    >
      {children}
    </FlexWidget>
  );

  // Brand continue-reading card: solid brandSurface, no motif wash.
  if (solidBackground !== undefined) {
    return (
      <FlexWidget
        accessibilityLabel={options.accessibilityLabel}
        clickAction={options.click?.clickAction}
        clickActionData={options.click?.clickActionData}
        style={{
          backgroundColor: solidBackground,
          borderColor: solidBackground,
          borderRadius: radius.xl,
          borderWidth: 1,
          flexDirection: 'column',
          height: 'match_parent',
          width: 'match_parent',
        }}
      >
        {body}
      </FlexWidget>
    );
  }

  // Raised cards: diagonal fillSecondary → surfaceRaised + hairline star watermark.
  return (
    <OverlapWidget
      accessibilityLabel={options.accessibilityLabel}
      clickAction={options.click?.clickAction}
      clickActionData={options.click?.clickActionData}
      style={{
        borderColor: palette.line,
        borderRadius: radius.xl,
        borderWidth: 1,
        height: 'match_parent',
        overflow: 'hidden',
        width: 'match_parent',
      }}
    >
      <FlexWidget
        style={{
          backgroundGradient: {
            from: palette.fillSecondary,
            orientation: 'TL_BR',
            to: palette.surfaceRaised,
          },
          borderRadius: radius.xl,
          height: 'match_parent',
          width: 'match_parent',
        }}
      />
      <FlexWidget
        style={{
          alignItems: 'flex-end',
          height: 'match_parent',
          justifyContent: 'flex-end',
          width: 'match_parent',
        }}
      >
        <SvgWidget
          style={{ height: MOTIF_SIZE, width: MOTIF_SIZE }}
          svg={cardMotifSvg(withAlpha(palette.brand, 0.1), MOTIF_SIZE)}
        />
      </FlexWidget>
      {body}
    </OverlapWidget>
  );
}
