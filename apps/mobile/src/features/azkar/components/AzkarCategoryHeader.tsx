import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { AzkarProgressBar } from './AzkarProgressBar';
import { AzkarScreenHeader } from './AzkarScreenHeader';

/**
 * The category screen's header (quran-app-screens.html, #AzkarCategory): back, the category name, the sourced line
 * («حصن المسلم · ٢٤ ذكرًا»), and the progress «١٢ من ٢٤» with its bar. A chapter has no Arabic title in production,
 * so the name is always the localised category label.
 */
export function AzkarCategoryHeader({
  title,
  sourceLine,
  progressText,
  fraction,
  onBack,
  testID = 'azkar-category-header',
}: {
  title: string;
  sourceLine: string;
  progressText: string;
  fraction: number;
  onBack: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <AzkarScreenHeader onBack={onBack} subtitle={sourceLine} title={title} />
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
        <View style={{ flex: 1 }}>
          <AzkarProgressBar fraction={fraction} testID={`${testID}-bar`} />
        </View>
        <UiText tone="muted" variant="caption" weight={600}>
          {progressText}
        </UiText>
      </View>
    </View>
  );
}
