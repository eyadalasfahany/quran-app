import { FlatList, ScrollView, SectionList } from 'react-native';

/** Scroll views never draw an indicator — the frames have none, and the user asked they stay gone. */
export const HIDDEN_SCROLL_INDICATORS = {
  showsHorizontalScrollIndicator: false,
  showsVerticalScrollIndicator: false,
} as const;

function hideOn(component: { defaultProps?: object | null }) {
  component.defaultProps = { ...component.defaultProps, ...HIDDEN_SCROLL_INDICATORS };
}

hideOn(ScrollView);
hideOn(FlatList);
hideOn(SectionList);
