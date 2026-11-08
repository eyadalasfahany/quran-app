import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { IconButton } from '@/shared/ui';

import { HadithBookmarkButton } from './HadithBookmarkButton';

const COPY = { ios: 'doc.on.doc', android: 'content_copy' } as const;
const SHARE = { ios: 'square.and.arrow.up', android: 'share' } as const;
// The gap between the three round buttons. No container: each button is its own raised circle.
const BUTTON_GAP = 2;

/** The reader's save, copy and share: three 44 pt round buttons in that order, with no container behind them. */
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
    <View
      accessibilityLabel={t('hadith.reader.toolbar')}
      accessibilityRole="toolbar"
      style={{ alignItems: 'center', flexDirection: 'row', gap: BUTTON_GAP }}
      testID={testID}
    >
      <HadithBookmarkButton onToggle={onToggleSave} saved={saved} testID={`${testID}-save`} variant="raised" />
      {shareable ? (
        <IconButton icon={COPY} label={t('hadith.reader.copy')} onPress={onCopy} testID={`${testID}-copy`} variant="raised" />
      ) : null}
      {shareable ? (
        <IconButton icon={SHARE} label={t('hadith.reader.share')} onPress={onShare} testID={`${testID}-share`} variant="raised" />
      ) : null}
    </View>
  );
}
