import { modalLikeScreenOptions, pushScreenOptions } from './push-screen-options';

describe('pushScreenOptions', () => {
  it('slides Android screens in from the right in LTR', () => {
    expect(pushScreenOptions({ platform: 'android', isRTL: false, reduceMotion: false })).toEqual({
      animation: 'slide_from_right',
      gestureEnabled: true,
    });
  });

  it('slides Android screens in from the left in RTL', () => {
    expect(pushScreenOptions({ platform: 'android', isRTL: true, reduceMotion: false })).toEqual({
      animation: 'slide_from_left',
      gestureEnabled: true,
    });
  });

  it('keeps the native default on iOS in both directions with a full-screen pop gesture', () => {
    for (const isRTL of [false, true]) {
      expect(pushScreenOptions({ platform: 'ios', isRTL, reduceMotion: false })).toEqual({
        animation: 'default',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      });
    }
  });

  it('fades on both platforms in both directions when Reduce Motion is on', () => {
    for (const isRTL of [false, true]) {
      expect(pushScreenOptions({ platform: 'android', isRTL, reduceMotion: true })).toEqual({
        animation: 'fade',
        gestureEnabled: true,
      });
      expect(pushScreenOptions({ platform: 'ios', isRTL, reduceMotion: true })).toEqual({
        animation: 'fade',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      });
    }
  });

  it('does not set fullScreenGestureEnabled on Android', () => {
    for (const isRTL of [false, true]) {
      for (const reduceMotion of [false, true]) {
        expect(pushScreenOptions({ platform: 'android', isRTL, reduceMotion })).not.toHaveProperty(
          'fullScreenGestureEnabled',
        );
      }
    }
  });

  it('always enables the back gesture', () => {
    for (const platform of ['ios', 'android']) {
      for (const isRTL of [false, true]) {
        for (const reduceMotion of [false, true]) {
          expect(pushScreenOptions({ platform, isRTL, reduceMotion }).gestureEnabled).toBe(true);
        }
      }
    }
  });
});

describe('modalLikeScreenOptions', () => {
  it('rises from the bottom on iOS with a vertical dismiss gesture', () => {
    expect(modalLikeScreenOptions({ platform: 'ios', reduceMotion: false })).toEqual({
      animation: 'slide_from_bottom',
      gestureDirection: 'vertical',
      gestureEnabled: true,
    });
  });

  it('rises from the bottom on Android without a gesture direction', () => {
    const options = modalLikeScreenOptions({ platform: 'android', reduceMotion: false });
    expect(options).toEqual({ animation: 'slide_from_bottom', gestureEnabled: true });
    expect(options).not.toHaveProperty('gestureDirection');
  });

  it('fades on both platforms when Reduce Motion is on', () => {
    expect(modalLikeScreenOptions({ platform: 'ios', reduceMotion: true })).toEqual({
      animation: 'fade',
      gestureDirection: 'vertical',
      gestureEnabled: true,
    });
    expect(modalLikeScreenOptions({ platform: 'android', reduceMotion: true })).toEqual({
      animation: 'fade',
      gestureEnabled: true,
    });
  });
});
