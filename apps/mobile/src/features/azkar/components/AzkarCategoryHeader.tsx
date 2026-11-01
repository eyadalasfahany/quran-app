import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import { AzkarProgressBar } from './AzkarProgressBar';
import { AzkarScreenHeader } from './AzkarScreenHeader';

const BELL = { ios: 'bell', android: 'notifications' } as const;

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
  onRemind,
  testID = 'azkar-category-header',
}: {
  title: string;
  sourceLine: string;
  progressText: string;
  fraction: number;
  onBack: () => void;
  /** Opens the reminder sheet for this category (the bell). Omitted, the header has no bell. */
  onRemind?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ gap: theme.space[4] }} testID={testID}>
      <AzkarScreenHeader
        onBack={onBack}
        subtitle={sourceLine}
        title={title}
        trailing={
          onRemind ? (
            <IconButton
              icon={BELL}
              label={t('azkar.reminders.title')}
              onPress={onRemind}
              testID={`${testID}-remind`}
              variant="raised"
            />
          ) : undefined
        }
      />
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
