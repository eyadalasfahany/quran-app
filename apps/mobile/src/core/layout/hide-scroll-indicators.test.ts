import { FlatList, ScrollView, SectionList } from 'react-native';

import { HIDDEN_SCROLL_INDICATORS } from './hide-scroll-indicators';

describe('hide-scroll-indicators', () => {
  it('hides both indicators on every built-in list', () => {
    expect(ScrollView.defaultProps).toMatchObject(HIDDEN_SCROLL_INDICATORS);
    expect(FlatList.defaultProps).toMatchObject(HIDDEN_SCROLL_INDICATORS);
    expect(SectionList.defaultProps).toMatchObject(HIDDEN_SCROLL_INDICATORS);
  });
});
