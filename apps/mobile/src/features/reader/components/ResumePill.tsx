import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, uiTextProps } from '@/shared/ui';

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
          minHeight: 44,
          paddingHorizontal: theme.space[4],
        }}
      >
        <Text {...uiTextProps('subhead', 'bar')} style={[theme.text.subhead, { color: theme.colors.ink }]}>
          {label}
        </Text>
      </Pressable>
    </GlassSurface>
  );
}
