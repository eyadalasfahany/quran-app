import { Children, type ReactNode } from 'react';
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
  type ClickActionProps,
  type FlexWidgetStyle,
} from 'react-native-android-widget';

import type { WidgetFontName } from './fonts';
import type { HexColor } from './theme';

/**
 * The layout helpers every widget uses. They return the library's own primitives, not React components, so the
 * library can turn them into a RemoteViews tree. The library has no direction style and its START and END gravity
 * depend on the device, so the helpers use absolute alignment and order Arabic rows by hand (`orderedChildren`).
 */

export type TextOptions = {
  size: number;
  font: WidgetFontName;
  color: HexColor;
  align?: 'left' | 'right' | 'center';
  maxLines?: number;
};

/** Text aligned to the reading start: right in Arabic, left in English. */
export function startAlign(rtl: boolean): 'left' | 'right' {
  return rtl ? 'right' : 'left';
}

/**
 * The children of a row, in the order they are drawn left to right. A horizontal LinearLayout draws its first child on
 * the left, so an RTL row lists its children reversed: the first item sits on the right, as in the frames.
 */
export function orderedChildren(children: ReactNode[], rtl: boolean): ReactNode[] {
  const list = Children.toArray(children);
  return rtl ? list.reverse() : list;
}

export function label(text: string, options: TextOptions, rtl: boolean) {
  return (
    <TextWidget
      maxLines={options.maxLines ?? 1}
      style={{
        color: options.color,
        fontFamily: options.font,
        fontSize: options.size,
        textAlign: options.align ?? startAlign(rtl),
      }}
      text={text}
    />
  );
}

export function row(children: ReactNode[], rtl: boolean, style: FlexWidgetStyle = {}, click: ClickActionProps = {}) {
  return (
    <FlexWidget {...click} style={{ alignItems: 'center', flexDirection: 'row', ...style }}>
      {orderedChildren(children, rtl)}
    </FlexWidget>
  );
}

export function column(children: ReactNode[], style: FlexWidgetStyle = {}, click: ClickActionProps = {}) {
  return (
    <FlexWidget {...click} style={{ flexDirection: 'column', ...style }}>
      {Children.toArray(children)}
    </FlexWidget>
  );
}

/** A flexible gap: takes the space left over, so the items after it sit at the far side. */
export function spacer() {
  return <FlexWidget style={{ flex: 1 }} />;
}

/** A fixed-size block, for dividers and bars. */
export function block(style: FlexWidgetStyle) {
  return <FlexWidget style={style} />;
}

/**
 * A ring with an element centred over it: the SVG ring and the centre content share one box. The centre content is
 * centred by its own container (CENTER gravity, which does not depend on the device direction).
 */
export function ringWithCentre(ringSvg: string, size: number, centre: ReactNode) {
  return (
    <OverlapWidget style={{ height: size, width: size }}>
      <SvgWidget style={{ height: size, width: size }} svg={ringSvg} />
      <FlexWidget
        style={{ alignItems: 'center', height: 'match_parent', justifyContent: 'center', width: 'match_parent' }}
      >
        {centre}
      </FlexWidget>
    </OverlapWidget>
  );
}

/** A child that takes the space it can, so the children after it sit at the far side of a row or column. */
export function grow(child: ReactNode, style: FlexWidgetStyle = {}) {
  return <FlexWidget style={{ flex: 1, flexDirection: 'column', ...style }}>{child}</FlexWidget>;
}
