import { useTranslation } from 'react-i18next';

import { MenuCard } from '@/features/menu/components/MenuCard';

export const MENU_DUAS_ICON = { ios: 'hands.sparkles', android: 'volunteer_activism' } as const;

/**
 * The Duas card in the Menu grid (screens/, #MenuNewCards / DuasHome): the shared menu card opening
 * `/duas`, sibling to the Azkar card.
 */
export function MenuDuasCard({
  onPress,
  testID = 'menu-card-duas',
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <MenuCard
      caption={t('duas.menu.caption')}
      icon={MENU_DUAS_ICON}
      onPress={onPress}
      preview={t('duas.menu.subtitle')}
      testID={testID}
      title={t('duas.menu.title')}
    />
  );
}
