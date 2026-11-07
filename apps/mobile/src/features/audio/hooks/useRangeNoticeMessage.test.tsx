import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { i18n } from '@/core/i18n';

import { resetRangeNoticeForTests, useRangeNoticeStore } from '../range-notice';
import { resetRangeAnnouncementForTests, useRangeNoticeMessage } from './useRangeNoticeMessage';

let announce: jest.SpyInstance;

beforeEach(async () => {
  await i18n.changeLanguage('ar');
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  resetRangeNoticeForTests();
  resetRangeAnnouncementForTests();
});

afterEach(() => {
  resetRangeNoticeForTests();
  announce.mockRestore();
});

async function show() {
  await act(async () => {
    useRangeNoticeStore.getState().show();
  });
}

describe('useRangeNoticeMessage', () => {
  it('is null without a notice and announces nothing', async () => {
    const { result } = await renderHook(() => useRangeNoticeMessage());

    expect(result.current).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('gives the Arabic copy and announces it once', async () => {
    const { result } = await renderHook(() => useRangeNoticeMessage());

    await show();

    expect(result.current).toBe('هذا الجزء غير مسجّل لهذا القارئ');
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('هذا الجزء غير مسجّل لهذا القارئ');
  });

  it('gives the English copy', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const { result } = await renderHook(() => useRangeNoticeMessage());

    await show();

    expect(result.current).toBe("This part isn't recorded for this reciter");
  });

  it('announces a new notice again', async () => {
    await renderHook(() => useRangeNoticeMessage());

    await show();
    await show();

    expect(announce).toHaveBeenCalledTimes(2);
  });
});
