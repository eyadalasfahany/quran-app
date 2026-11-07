import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useRangeNoticeStore } from '../range-notice';

// The id of the last notice announced. Module-level, so a notice is announced once even when two bars mount.
let announcedId: number | null = null;

/** The range notice's text for the bar, or null. Announces it to VoiceOver and TalkBack once per notice. */
export function useRangeNoticeMessage(): string | null {
  const { t } = useTranslation();
  const notice = useRangeNoticeStore((state) => state.notice);
  const message = notice === null ? null : t('player.mini.notRecorded');

  useEffect(() => {
    if (notice === null || message === null || notice.id === announcedId) {
      return;
    }
    if (useRangeNoticeStore.getState().notice?.id !== notice.id) {
      return;
    }
    announcedId = notice.id;
    AccessibilityInfo.announceForAccessibility(message);
  }, [notice, message]);

  return message;
}

/** Test-only: forget which notice was announced. */
export function resetRangeAnnouncementForTests(): void {
  announcedId = null;
}
