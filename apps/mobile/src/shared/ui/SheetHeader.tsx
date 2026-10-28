import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { IconButton } from './IconButton';
import { UiText } from './UiText';

const CLOSE = { ios: 'xmark', android: 'close' } as const;

// The title row of a sheet or side panel, with its close button at the end.
// 'large' titles a whole sheet (Reader settings); 'compact' names the ayah a panel is about.
export function SheetHeader({
  title,
  subtitle,
  size = 'large',
  onClose,
  closeLabel,
  closeTone = 'fill',
  testID,
}: {
  title: string;
  subtitle?: string | null;
  size?: 'large' | 'compact';
  onClose?: () => void;
  closeLabel?: string;
  /** Close button fill: `fill` is fillSecondary (Ayah actions, Tafsir); `track` is fillTrack (Reader settings). */
  closeTone?: 'fill' | 'track';
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <View style={{ flex: 1 }}>
        <UiText
          accessibilityRole="header"
          testID={testID ? `${testID}-title` : undefined}
          variant={size === 'large' ? 'title' : 'headline'}
        >
          {title}
        </UiText>
        {subtitle ? (
          <UiText testID={testID ? `${testID}-subtitle` : undefined} tone="muted" variant="label" weight={400}>
            {subtitle}
          </UiText>
        ) : null}
      </View>
      {onClose && closeLabel ? (
        <IconButton
          icon={CLOSE}
          iconSize={theme.size.closeGlyph}
          label={closeLabel}
          onPress={onClose}
          testID={testID ? `${testID}-close` : undefined}
          variant={closeTone === 'track' ? 'track' : 'filled'}
        />
      ) : null}
    </View>
  );
}
