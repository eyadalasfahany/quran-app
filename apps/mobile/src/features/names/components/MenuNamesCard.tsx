import { useTranslation } from 'react-i18next';

import { MenuCard } from '@/features/menu/components/MenuCard';

export const MENU_NAMES_ICON = { ios: 'square.grid.2x2', android: 'grid_view' } as const;

export function MenuNamesCard({
  onPress,
  testID = 'menu-card-names',
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <MenuCard
      caption={t('names.menu.caption')}
      icon={MENU_NAMES_ICON}
      onPress={onPress}
      preview={t('names.menu.subtitle')}
      testID={testID}
      title={t('names.menu.title')}
    />
  );
}
