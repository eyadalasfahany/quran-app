import { Linking, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

/** The link to the dua's source page, in the brand tone under a prophetic dua (quran-app-screens.html, #DuaHadithDetail). */
export function DuaSourceLink({ url, testID = 'dua-source-link' }: { url: string; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={t('duas.hadith.openSource')}
      accessibilityRole="link"
      onPress={() => {
        void Linking.openURL(url);
      }}
      style={({ pressed }) => ({
        alignItems: 'center',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
      })}
      testID={testID}
    >
      <UiText tone="brand" variant="caption" weight={600}>
        {t('duas.hadith.openSource')}
      </UiText>
    </Pressable>
  );
}
