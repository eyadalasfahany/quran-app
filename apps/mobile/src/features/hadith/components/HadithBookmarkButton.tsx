import { useTranslation } from 'react-i18next';

import { IconButton, type IconButtonVariant } from '@/shared/ui';

const OUTLINE = { ios: 'bookmark', android: 'bookmark' } as const;
const FILLED = { ios: 'bookmark.fill', android: 'bookmark_added' } as const;

/** Save or remove the hadith. `pressed` is the saved state, read as selected by screen readers. */
export function HadithBookmarkButton({
  saved,
  onToggle,
  variant = 'plain',
  testID = 'hadith-bookmark-button',
}: {
  saved: boolean;
  onToggle: () => void;
  variant?: IconButtonVariant;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <IconButton
      icon={saved ? FILLED : OUTLINE}
      label={t(saved ? 'hadith.reader.unsave' : 'hadith.reader.save')}
      onPress={onToggle}
      pressed={saved}
      testID={testID}
      variant={variant}
    />
  );
}
