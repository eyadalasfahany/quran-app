import { useTranslation } from 'react-i18next';

import { MenuCard } from '@/features/menu/components/MenuCard';

export const MENU_HADITH_ICON = { ios: 'quote.opening', android: 'format_quote' } as const;

/** The Hadith card in the Menu grid. It opens the collections list (frame HadithCollMenu). */
export function MenuHadithCard({
  onPress,
  testID = 'menu-card-hadith',
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <MenuCard
      caption={t('hadith.menu.caption')}
      icon={MENU_HADITH_ICON}
      onPress={onPress}
      preview={t('hadith.menu.subtitle')}
      testID={testID}
      title={t('hadith.menu.title')}
    />
  );
}
