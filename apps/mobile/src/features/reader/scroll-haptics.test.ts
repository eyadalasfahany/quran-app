import { createScrollHaptics } from './scroll-haptics';

describe('createScrollHaptics', () => {
  let t = 0;
  const now = () => t;
  let play: jest.Mock;

  beforeEach(() => {
    t = 0;
    play = jest.fn();
  });

  describe('verses', () => {
    it('sets the baseline on the first verse without playing', () => {
      const haptics = createScrollHaptics(play, now);

      haptics.onVerse('1:1');

      expect(play).not.toHaveBeenCalled();
    });

    it('does not play when the same verse is reported again', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onVerse('1:1');

      haptics.onVerse('1:1');

      expect(play).not.toHaveBeenCalled();
    });

    it('plays ayah when the next ayah is in the same surah', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onVerse('2:1');

      haptics.onVerse('2:2');

      expect(play).toHaveBeenCalledTimes(1);
      expect(play).toHaveBeenCalledWith('ayah');
    });

    it('plays surah when the ayah is in another surah', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onVerse('1:7');

      haptics.onVerse('2:1');

      expect(play).toHaveBeenCalledTimes(1);
      expect(play).toHaveBeenCalledWith('surah');
    });

    it('drops a haptic inside the 80 ms window but still moves the baseline', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onVerse('1:1');

      t = 100;
      haptics.onVerse('1:2');
      t = 120;
      haptics.onVerse('1:3');
      t = 210;
      haptics.onVerse('1:4');

      expect(play.mock.calls).toEqual([['ayah'], ['ayah']]);
    });

    it('plays again exactly 80 ms after the last haptic', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onVerse('1:1');

      t = 100;
      haptics.onVerse('1:2');
      t = 180;
      haptics.onVerse('1:3');

      expect(play).toHaveBeenCalledTimes(2);
    });
  });

  describe('pages', () => {
    it('sets the baseline on the first page without playing', () => {
      const haptics = createScrollHaptics(play, now);

      haptics.onPage(1, true);

      expect(play).not.toHaveBeenCalled();
    });

    it('plays surah when the page changes to one that starts a surah', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onPage(1, true);

      haptics.onPage(2, true);

      expect(play).toHaveBeenCalledTimes(1);
      expect(play).toHaveBeenCalledWith('surah');
    });

    it('does not play when the page changes to one without a surah start', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onPage(2, true);

      haptics.onPage(3, false);

      expect(play).not.toHaveBeenCalled();
    });

    it('does not play when the same page is reported again', () => {
      const haptics = createScrollHaptics(play, now);
      haptics.onPage(2, true);

      haptics.onPage(2, true);

      expect(play).not.toHaveBeenCalled();
    });
  });

  it('reset() makes the next report a baseline again', () => {
    const haptics = createScrollHaptics(play, now);
    haptics.onVerse('1:1');
    haptics.onPage(1, true);

    haptics.reset();
    haptics.onVerse('2:1');
    haptics.onPage(2, true);

    expect(play).not.toHaveBeenCalled();
  });
});
