import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';

export function ResumePill({ onPress, testID = 'reader-resume' }: { onPress: () => void; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const label = t('reader.resume.label');

  return (
    <GlassSurface radius="pill" testID={testID}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: theme.size.touchTarget,
          paddingHorizontal: theme.space[4],
        }}
      >
        <UiText scale="bar" variant="subhead">
          {label}
        </UiText>
      </Pressable>
    </GlassSurface>
  );
}
