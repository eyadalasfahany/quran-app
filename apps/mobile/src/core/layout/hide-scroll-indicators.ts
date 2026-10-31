import { FlatList, ScrollView, SectionList } from 'react-native';

/** Scroll views never draw an indicator — the frames have none, and the user asked they stay gone. */
export const HIDDEN_SCROLL_INDICATORS = {
  showsHorizontalScrollIndicator: false,
  showsVerticalScrollIndicator: false,
} as const;

/** React Native's typings dropped `defaultProps` on these components; the runtime still honours it. */
export type WithDefaultProps = { defaultProps?: Record<string, unknown> | null };

function hideOn(component: unknown) {
  const target = component as WithDefaultProps;
  target.defaultProps = { ...target.defaultProps, ...HIDDEN_SCROLL_INDICATORS };
}

hideOn(ScrollView);
hideOn(FlatList);
hideOn(SectionList);
