import { useTranslation } from 'react-i18next';

import { IconButton, ToolbarPill } from '@/shared/ui';

import { HadithBookmarkButton } from './HadithBookmarkButton';

const COPY = { ios: 'doc.on.doc', android: 'content_copy' } as const;
const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;

/** The reader's glass pill: save, copy and share, three 44 pt buttons in that order. */
export function HadithToolbar({
  saved,
  onToggleSave,
  onCopy,
  onShare,
  shareable = true,
  testID = 'hadith-toolbar',
}: {
  saved: boolean;
  onToggleSave: () => void;
  onCopy: () => void;
  onShare: () => void;
  /** False for a placeholder: copy and share are hidden, save stays (ADR 0076). */
  shareable?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <ToolbarPill label={t('hadith.reader.toolbar')} testID={testID}>
      <HadithBookmarkButton onToggle={onToggleSave} saved={saved} testID={`${testID}-save`} variant="glass" />
      {shareable ? (
        <IconButton icon={COPY} label={t('hadith.reader.copy')} onPress={onCopy} testID={`${testID}-copy`} variant="glass" />
      ) : null}
      {shareable ? (
        <IconButton icon={SHARE} label={t('hadith.reader.share')} onPress={onShare} testID={`${testID}-share`} variant="glass" />
      ) : null}
    </ToolbarPill>
  );
}
