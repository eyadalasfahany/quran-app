import { shownMushafKey } from './shown-mushaf';

describe('shownMushafKey', () => {
  it('shows the chosen mushaf when nothing plays', () => {
    expect(shownMushafKey({ chosen: 'warsh', playing: false, reciterRiwayah: 'hafs' })).toBe('warsh');
  });

  it('shows the reciter riwayah while playing', () => {
    expect(shownMushafKey({ chosen: 'warsh', playing: true, reciterRiwayah: 'qalun' })).toBe('qalun');
  });

  it('shows Hafs while playing when the reciter riwayah is unknown', () => {
    expect(shownMushafKey({ chosen: 'warsh', playing: true, reciterRiwayah: null })).toBe('hafs');
  });

  it('shows the chosen mushaf when nothing plays and the chosen one is Hafs', () => {
    expect(shownMushafKey({ chosen: 'hafs', playing: false, reciterRiwayah: null })).toBe('hafs');
  });
});
