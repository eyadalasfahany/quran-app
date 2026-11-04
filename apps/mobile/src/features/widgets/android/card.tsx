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
 * Home-screen widget card: solid brandSurface + soft hizb-star watermark (ADR 0035, amended 3 Nov 2026). The root is the
 * tap target and TalkBack label (ADR 0035 §1).
 */
export function card(
  ctx: WidgetContext,
  children: ReactNode[],
  options: { background?: HexColor; click?: ClickActionProps; accessibilityLabel: string },
) {
  const { palette } = ctx;
  const background = options.background ?? palette.brandSurface;
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

  return (
    <OverlapWidget
      accessibilityLabel={options.accessibilityLabel}
      clickAction={options.click?.clickAction}
      clickActionData={options.click?.clickActionData}
      style={{
        backgroundColor: background,
        borderColor: background,
        borderRadius: radius.xl,
        borderWidth: 1,
        height: 'match_parent',
        overflow: 'hidden',
        width: 'match_parent',
      }}
    >
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
          svg={cardMotifSvg(withAlpha(palette.onBrandSurface, 0.1), MOTIF_SIZE)}
        />
      </FlexWidget>
      {body}
    </OverlapWidget>
  );
}
