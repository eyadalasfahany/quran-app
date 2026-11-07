import { useReducedMotion } from 'react-native-reanimated';

import { i18n } from '@/core/i18n';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';

import { PartialRangeNotice } from './PartialRangeNotice';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

(useReducedMotion as unknown as jest.Mock).mockReturnValue(false);

describe('PartialRangeNotice', () => {
  it('renders the message as one status line with its own test id', async () => {
    const view = await renderUi(<PartialRangeNotice message="نص تجريبي" />);

    expect(view.getByTestId('partial-range-notice')).toBeOnTheScreen();
    expect(view.getByRole('status').props.children).toBe('نص تجريبي');
    expect(view.getByRole('status').props.numberOfLines).toBe(1);
  });

  it('takes another test id', async () => {
    const view = await renderUi(<PartialRangeNotice message="نص تجريبي" testID="other" />);

    expect(view.getByTestId('other')).toBeOnTheScreen();
  });

  it('is an accessible status that announces nothing itself (the hook announces once)', async () => {
    const view = await renderUi(<PartialRangeNotice message="نص تجريبي" />);

    expect(view.getByRole('status').props.accessible).toBe(true);
    expect(view.getByRole('status').props.accessibilityLiveRegion).toBeUndefined();
  });

  it.each(locales)('renders the shipped copy in %s', async (locale) => {
    const message = i18n.getFixedT(locale)('player.mini.notRecorded');
    const view = await renderUi(<PartialRangeNotice message={message} />, { locale });

    expect(view.getByText(message)).toBeOnTheScreen();
    expect(message).toBe(locale === 'ar' ? 'هذا الجزء غير مسجّل لهذا القارئ' : "This part isn't recorded for this reciter");
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PartialRangeNotice.tsx')).toEqual([]);
  });
});
