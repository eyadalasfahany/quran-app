import { useTranslation } from 'react-i18next';

import { MenuCard } from '@/features/menu/components/MenuCard';

const CALENDAR = { ios: 'calendar', android: 'calendar_month' } as const;

/**
 * The Hijri calendar card in the Menu grid (quran-app-screens.html, #MenuNewCards): the shared menu card with today's
 * Hijri date as its line. It reuses MenuCard, so the radius, hairline and type match the other cards.
 */
export function MenuHijriCard({
  preview,
  onPress,
  testID = 'menu-card-hijri',
}: {
  /** Today's Hijri date with the adjustment, in the locale's digits. */
  preview: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <MenuCard
      caption={t('hijri.menu.caption')}
      icon={CALENDAR}
      onPress={onPress}
      preview={preview}
      testID={testID}
      title={t('hijri.menu.title')}
    />
  );
}
