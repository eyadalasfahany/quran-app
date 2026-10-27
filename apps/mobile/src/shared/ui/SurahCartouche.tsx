import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { GoldFrame } from './GoldFrame';
import { UiText } from './UiText';

export function SurahCartouche({ name, testID }: { name: string; testID?: string }) {
  const theme = useTheme();
  return (
    <View accessibilityLabel={name} accessibilityRole="header" accessible style={{ alignSelf: 'stretch' }}>
      <GoldFrame
        contentStyle={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          paddingHorizontal: theme.space[4],
        }}
        testID={testID}
        variant="band"
      >
        <UiText align="center" style={{ writingDirection: 'rtl' }} variant="displaySm">
          {name}
        </UiText>
      </GoldFrame>
    </View>
  );
}
