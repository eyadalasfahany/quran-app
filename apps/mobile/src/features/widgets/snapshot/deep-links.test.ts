import { isAllowedWidgetPath, widgetPaths, widgetUrl } from './deep-links';

describe('widget deep links', () => {
  it.each(['/salah', '/sibha', '/daily-goals', '/khatma', '/azkar', '/read/2:255', '/azkar/read/morning'])(
    'accepts the existing route %s',
    (path) => {
      expect(isAllowedWidgetPath(path)).toBe(true);
    },
  );

  it.each(['/salahx', '/settings', '/read/', '/read/abc', '/read/0:1', '/azkar/read/', '/azkar/read/a b', '/x/../salah'])(
    'refuses %s',
    (path) => {
      expect(isAllowedWidgetPath(path)).toBe(false);
    },
  );

  it('builds a URL in the variant scheme', () => {
    expect(widgetUrl(widgetPaths.reading('2:255'), 'taybah')).toBe('taybah://read/2:255');
    expect(widgetUrl(widgetPaths.misbaha, 'taybah-dev')).toBe('taybah-dev://sibha');
  });

  it('returns null for an unknown scheme or a refused path', () => {
    expect(widgetUrl('/salah', 'https')).toBeNull();
    expect(widgetUrl('/settings', 'taybah')).toBeNull();
  });
});
