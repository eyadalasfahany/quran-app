import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import { TafsirStorageRow } from './TafsirStorageRow';

type Props = {
  tafsirs: { resourceId: number; nameAr: string | null; packSizeBytes: number }[];
  testID?: string;
};

export function MushafsTextSection({ tafsirs, testID }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const sectionInset = theme.space[1] + 2;

  return (
    <View style={{ gap: sectionInset }} testID={testID}>
      <UiText
        accessibilityRole="header"
        style={{ marginHorizontal: sectionInset }}
        tone="muted"
        variant="caption"
        weight={600}
      >
        {t('downloads.screen.texts')}
      </UiText>
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            borderBottomColor: colors.line,
            borderBottomWidth: theme.stroke.hairline,
            flexDirection: 'row',
            gap: theme.space[3],
            minHeight: theme.size.downloadRowMinHeight,
            paddingHorizontal: theme.size.downloadRowInset,
          }}
          testID={testID ? `${testID}-hafs` : undefined}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <UiText variant="headline">{t('downloads.screen.hafsLabel')}</UiText>
            <UiText tone="muted" variant="label" weight={400}>
              {t('downloads.screen.hafsSubtitle')}
            </UiText>
          </View>
        </View>
        {tafsirs.map((row, index) => (
          <TafsirStorageRow
            key={row.resourceId}
            nameAr={row.nameAr}
            packSizeBytes={row.packSizeBytes}
            resourceId={row.resourceId}
            showDivider={index < tafsirs.length - 1}
            testID={testID ? `${testID}-tafsir-${row.resourceId}` : undefined}
          />
        ))}
      </View>
    </View>
  );
}
