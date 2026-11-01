import type { Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { UiText } from '@/shared/ui';

import { RecentAzkarRow } from './RecentAzkarRow';

export type RecentAzkarListItem = {
  key: string;
  title: string;
  meta: string;
  href: Href;
};

// The section's heading and each row are 10 pt apart (quran-app-screens.html, #Main «آخر الأذكار»).
const SECTION_GAP = 10;

/**
 * «آخر الأذكار» on Home (ADR 0034 §3): the Azkar opened most recently, newest first, each opening where the user left
 * off. Hidden when nothing has been opened.
 */
export function RecentAzkarSection({
  items,
  onOpen,
  testID = 'home-recent-azkar',
}: {
  items: readonly RecentAzkarListItem[];
  onOpen: (href: Href) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: SECTION_GAP }} testID={testID}>
      <UiText accessibilityRole="header" tone="muted" variant="headline">
        {t('home.recentAzkar.heading')}
      </UiText>
      {items.map((item) => (
        <RecentAzkarRow
          key={item.key}
          meta={item.meta}
          onPress={() => onOpen(item.href)}
          testID={`${testID}-${item.key}`}
          title={item.title}
        />
      ))}
    </View>
  );
}
