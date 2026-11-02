import { activeWidgetWriters } from './writers';

jest.mock('./ios/app-group', () => ({
  isIosAppGroupStoreAvailable: jest.fn(() => false),
  iosAppGroupWidgetWriter: { id: 'ios-app-group', refresh: jest.fn(), write: jest.fn() },
}));

describe('activeWidgetWriters', () => {
  it('writes the canonical MMKV copy first, then asks Android widgets to redraw', () => {
    expect(activeWidgetWriters('android').map((writer) => writer.id)).toEqual(['mmkv', 'android']);
  });

  it('writes only the canonical copy on iOS until the App Group writer exists (prompt 16)', () => {
    expect(activeWidgetWriters('ios').map((writer) => writer.id)).toEqual(['mmkv']);
  });
});
