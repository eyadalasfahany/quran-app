import { useTranslation } from 'react-i18next';

import { MenuCard } from '@/features/menu/components/MenuCard';

const MOON = { ios: 'moon.fill', android: 'dark_mode' } as const;

export function MenuMoonCard({
  preview,
  onPress,
  testID = 'menu-card-moon',
}: {
  preview: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <MenuCard
      caption={t('moon.menu.caption')}
      icon={MOON}
      onPress={onPress}
      preview={preview}
      testID={testID}
      title={t('moon.menu.title')}
    />
  );
}
