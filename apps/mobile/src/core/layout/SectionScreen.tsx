import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

import { ContentColumn } from './ContentColumn';

export function SectionScreen({ title, testID }: { title: string; testID: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: theme.colors.surface, flex: 1, paddingTop: insets.top }} testID={testID}>
      <ContentColumn>
        <Text style={theme.text.title}>{title}</Text>
      </ContentColumn>
    </View>
  );
}
