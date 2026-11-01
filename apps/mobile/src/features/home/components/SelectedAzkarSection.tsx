import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { SelectedAzkarCard } from './SelectedAzkarCard';

// Cards in the row are 10 pt apart (quran-app-screens.html, #Main).
const ROW_GAP = 10;

export type SelectedAzkarItem = {
  id: string;
  title: string;
  progressText: string;
  /** 0 to 1 for the current period. */
  fraction: number;
};

/**
 * «أذكار مختارة» on Home (quran-app-screens.html, #Main, ADR 0034 §2): the session categories with today's progress, in a
 * row that scrolls sideways, and «عرض الكل» to the Azkar home. Nothing is drawn without a session.
 */
export function SelectedAzkarSection({
  items,
  onOpen,
  onSeeAll,
  testID = 'home-selected-azkar',
}: {
  items: readonly SelectedAzkarItem[];
  onOpen: (id: string) => void;
  onSeeAll: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText accessibilityRole="header" tone="muted" variant="headline">
          {t('home.selectedAzkar.heading')}
        </UiText>
        <Pressable
          accessibilityLabel={t('home.selectedAzkar.all')}
          accessibilityRole="button"
          onPress={onSeeAll}
          style={{ justifyContent: 'center', minHeight: theme.size.touchTarget, minWidth: theme.size.touchTarget }}
          testID={`${testID}-all`}
        >
          <UiText tone="brand" variant="subhead" weight={600}>
            {t('home.selectedAzkar.all')}
          </UiText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ gap: ROW_GAP }} horizontal showsHorizontalScrollIndicator={false} testID={`${testID}-list`}>
        {items.map((item) => (
          <SelectedAzkarCard
            fraction={item.fraction}
            key={item.id}
            onPress={() => onOpen(item.id)}
            progressText={item.progressText}
            testID={`${testID}-${item.id}`}
            title={item.title}
          />
        ))}
      </ScrollView>
    </View>
  );
}
