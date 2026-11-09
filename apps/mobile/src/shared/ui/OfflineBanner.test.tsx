import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { OfflineBanner } from './OfflineBanner';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

const arabic = 'أنت غير متصل. المصحف والتلاوات المحمّلة تعمل كالمعتاد.';
const english = 'You are offline. The mushaf and downloaded recitations work as usual.';

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockReduceMotion.mockReturnValue(false);
  });

  it('draws the message as a polite status notice when visible', async () => {
    const view = await renderUi(<OfflineBanner visible />);

    const status = view.getByLabelText(arabic);
    expect(status.props.accessibilityRole).toBe('text');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(view.getByText(arabic)).toBeOnTheScreen();
    // The glyph is decorative, so it is hidden from accessibility and found with includeHiddenElements.
    expect(view.getByTestId('offline-banner-icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('draws nothing once it is hidden under Reduce Motion', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(<OfflineBanner visible={false} />);

    expect(view.queryByTestId('offline-banner', { includeHiddenElements: true })).toBeNull();
    expect(view.queryByText(arabic)).toBeNull();
  });

  it('never takes a press: it is a notice, not a control', async () => {
    const view = await renderUi(<OfflineBanner visible />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it('uses the given testID', async () => {
    const view = await renderUi(<OfflineBanner testID="banner" visible />);

    expect(view.getByTestId('banner')).toBeOnTheScreen();
  });

  it.each(locales)('shows its message under %s', async (locale) => {
    const view = await renderUi(<OfflineBanner visible />, { locale });
    const message = locale === 'ar' ? arabic : english;

    expect(view.getByLabelText(message)).toBeOnTheScreen();
  });

  it('still shows its message under Reduce Motion', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(<OfflineBanner visible />);

    expect(view.getByLabelText(arabic)).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(rawColorLiterals('OfflineBanner.tsx')).toEqual([]);
  });
});
