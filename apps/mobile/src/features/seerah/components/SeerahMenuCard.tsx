import { useTranslation } from 'react-i18next';

import { MenuCard } from '@/features/menu/components/MenuCard';

export const MENU_SEERAH_ICON = { ios: 'map', android: 'map' } as const;

/** The Seerah card in the Menu grid (frame SeerahMenu). It opens the map. */
export function SeerahMenuCard({ onPress, testID = 'menu-card-seerah' }: { onPress: () => void; testID?: string }) {
  const { t } = useTranslation();

  return (
    <MenuCard
      caption={t('seerah.menu.caption')}
      icon={MENU_SEERAH_ICON}
      onPress={onPress}
      preview={t('seerah.menu.subtitle')}
      testID={testID}
      title={t('seerah.menu.title')}
    />
  );
}
