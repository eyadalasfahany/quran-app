import { useTranslation } from 'react-i18next';

import { IconButton } from './IconButton';

export const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;

/**
 * The back button of a pushed screen: a raised 44 pt disc with a chevron that points at the leading edge. The chevron
 * is drawn pointing left and mirrors under RTL (I18nManager.isRTL), so it points right in Arabic and left in English.
 * The row it sits in puts it on the leading edge, since flex rows follow the layout direction.
 */
export function BackButton({ onPress, testID = 'back-button' }: { onPress: () => void; testID?: string }) {
  const { t } = useTranslation();

  return (
    <IconButton icon={BACK_ICON} label={t('common.back')} mirrorInRtl onPress={onPress} testID={testID} variant="raised" />
  );
}
