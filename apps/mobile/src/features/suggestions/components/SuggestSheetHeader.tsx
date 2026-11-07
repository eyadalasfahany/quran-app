import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

/** The sheet's title row: the title at the start edge and a round close button at the end (screens/, #SuggestSheet). */
export function SuggestSheetHeader({
  title,
  closeLabel,
  onClose,
  testID = 'suggest-header',
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <UiText accessibilityRole="header" style={{ flex: 1 }} testID={`${testID}-title`} variant="headline">
        {title}
      </UiText>
      <IconButton icon={CLOSE} label={closeLabel} onPress={onClose} testID={`${testID}-close`} variant="raised" />
    </View>
  );
}
