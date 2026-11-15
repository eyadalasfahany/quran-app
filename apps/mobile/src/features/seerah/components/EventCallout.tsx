import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, UiText, arabicTextDirection, useContrastColors } from '@/shared/ui';

/**
 * The small card over a tapped single-event pin (frame SeerahMapMakkah): the event's title, its age and place, and the «فتح»
 * button that opens the event page. A tap on the card itself does the same. The screen anchors it above the pin; the tail
 * points at the pin.
 */
export function EventCallout({
  title,
  subtitle,
  onOpen,
  testID = 'seerah-event-callout',
}: {
  title: string;
  subtitle: string;
  onOpen: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View style={{ alignItems: 'center' }} testID={testID}>
      <Pressable
        accessibilityLabel={t('seerah.callout.openLabel', { title })}
        accessibilityRole="button"
        onPress={onOpen}
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.line,
          borderRadius: theme.radius.lg,
          borderWidth: theme.stroke.hairline,
          flexDirection: 'row',
          gap: theme.space[4],
          maxWidth: 360,
          minHeight: theme.size.touchTarget + theme.space[4],
          padding: theme.space[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <UiText numberOfLines={2} style={arabicTextDirection} variant="displaySm">
            {title}
          </UiText>
          <UiText numberOfLines={1} tone="muted" variant="caption">
            {subtitle}
          </UiText>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
          <Button label={t('seerah.callout.open')} onPress={onOpen} variant="primary" />
        </View>
      </Pressable>
      <View
        pointerEvents="none"
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderBottomColor: colors.line,
          borderBottomWidth: theme.stroke.hairline,
          borderRightColor: colors.line,
          borderRightWidth: theme.stroke.hairline,
          height: 14,
          marginTop: -7,
          transform: [{ rotate: '45deg' }],
          width: 14,
        }}
      />
    </View>
  );
}
