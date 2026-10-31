import { FlatList, ScrollView, SectionList } from 'react-native';

import { HIDDEN_SCROLL_INDICATORS, type WithDefaultProps } from './hide-scroll-indicators';

const defaultsOf = (component: unknown) => (component as WithDefaultProps).defaultProps;

describe('hide-scroll-indicators', () => {
  it('hides both indicators on every built-in list', () => {
    expect(defaultsOf(ScrollView)).toMatchObject(HIDDEN_SCROLL_INDICATORS);
    expect(defaultsOf(FlatList)).toMatchObject(HIDDEN_SCROLL_INDICATORS);
    expect(defaultsOf(SectionList)).toMatchObject(HIDDEN_SCROLL_INDICATORS);
  });
});
