import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { MiniPlayerNotice } from './MiniPlayerNotice';

// Placeholder copy only; the real line comes from the locale files.
const MESSAGE = 'تخطّي سورة نموذج · غير متوفرة بصوت قارئ نموذج';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mockReduce = useReducedMotion as unknown as jest.Mock;

describe('MiniPlayerNotice', () => {
  beforeEach(() => mockReduce.mockReturnValue(false));

  it('renders the message as one line in the gold-ink label', async () => {
    const view = await renderUi(<MiniPlayerNotice message={MESSAGE} testID="notice" />);
    const text = view.getByRole('status');

    expect(text.props.children).toBe(MESSAGE);
    expect(text.props.numberOfLines).toBe(1);
    expect(flatStyle(text.props.style)).toMatchObject({ fontSize: expect.any(Number) });
  });

  it('gives the line role status and is accessible, with no live region of its own', async () => {
    const view = await renderUi(<MiniPlayerNotice message={MESSAGE} />);
    const text = view.getByRole('status');

    expect(text.props.accessible).toBe(true);
    expect(text.props.accessibilityLiveRegion).toBeUndefined();
  });

  it('does not announce the message itself: the hook announces it once per notice', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    await renderUi(<MiniPlayerNotice message={MESSAGE} />);

    expect(announce).not.toHaveBeenCalled();
    announce.mockRestore();
  });

  it('passes the test id to the wrapper', async () => {
    const view = await renderUi(<MiniPlayerNotice message={MESSAGE} testID="mini-player-notice" />);

    expect(view.getByTestId('mini-player-notice')).toBeOnTheScreen();
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<MiniPlayerNotice message={MESSAGE} />, { locale });

    expect(view.getByText(MESSAGE)).toBeOnTheScreen();
  });

  it('moves nothing under Reduce Motion: no transform on the wrapper or the line', async () => {
    mockReduce.mockReturnValue(true);
    const view = await renderUi(<MiniPlayerNotice message={MESSAGE} testID="notice" />);

    expect(flatStyle(view.getByTestId('notice').props.style).transform).toBeUndefined();
    expect(flatStyle(view.getByRole('status').props.style).transform).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayerNotice.tsx')).toEqual([]);
  });
});
