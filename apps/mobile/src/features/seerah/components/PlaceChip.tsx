import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, arabicTextDirection, useContrastColors } from '@/shared/ui';

const PIN = { ios: 'mappin.and.ellipse', android: 'location_on' } as const;

/**
 * The place of an event on its page. A tap shows it on the map. `other` is the «أخرى» bucket (the book names no place): a
 * dashed edge, and it does nothing because it has no position. The place name is the book's Arabic in both languages.
 */
export function PlaceChip({
  name,
  other = false,
  onPress,
  testID = 'seerah-place-chip',
}: {
  name: string;
  other?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <Pressable
      accessibilityLabel={other ? name : t('seerah.event.placeChipLabel', { name })}
      accessibilityRole={other ? 'text' : 'button'}
      disabled={other}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.chipPanel,
        borderStyle: other ? 'dashed' : 'solid',
        borderWidth: other ? theme.stroke.focus : theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.size.chipPaddingX,
      }}
      testID={testID}
    >
      <Icon color={theme.colors.brand} name={PIN} size={theme.size.iconSm} />
      <UiText style={arabicTextDirection} variant="subhead" weight={500}>
        {name}
      </UiText>
    </Pressable>
  );
}
