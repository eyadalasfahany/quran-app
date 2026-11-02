import { FlexWidget, type ClickActionProps } from 'react-native-android-widget';
import type { ReactNode } from 'react';

import { radius } from '@quran/design-tokens';

import type { WidgetContext } from './context';
import type { HexColor } from './theme';

/** Widget padding: the frames' 14 dp (AndroidWidgets). Not a space token; the frames are the reference. */
const CARD_PADDING = 14;

/**
 * The card every widget draws on: the frames' surface card, with the design system's xl radius (28, the widget frames'
 * radius) and a hairline border. The root is the whole widget's tap target and its TalkBack label (ADR 0035 §1).
 */
export function card(
  ctx: WidgetContext,
  children: ReactNode[],
  options: { background?: HexColor; click?: ClickActionProps; accessibilityLabel: string },
) {
  const { palette } = ctx;
  const background = options.background ?? palette.surfaceRaised;
  return (
    <FlexWidget
      accessibilityLabel={options.accessibilityLabel}
      clickAction={options.click?.clickAction}
      clickActionData={options.click?.clickActionData}
      style={{
        backgroundColor: background,
        borderColor: options.background === undefined ? palette.line : background,
        borderRadius: radius.xl,
        borderWidth: 1,
        flexDirection: 'column',
        height: 'match_parent',
        padding: CARD_PADDING,
        width: 'match_parent',
      }}
    >
      {children}
    </FlexWidget>
  );
}
