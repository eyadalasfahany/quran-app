import { openSvgMushafPackAt, openSvgMushafPack } from './open-pack';

// expo-sqlite is not available under Jest, so only the paths that never open a database are tested here.
describe('opening an svg mushaf pack', () => {
  it('refuses a missing file instead of creating an empty database', () => {
    expect(() => openSvgMushafPackAt('file:///documents/packs/missing.db')).toThrow('The SVG mushaf pack is missing');
  });

  it('returns no cached reader when nothing is recorded', () => {
    expect(openSvgMushafPack('hafs')).toBeNull();
  });
});
