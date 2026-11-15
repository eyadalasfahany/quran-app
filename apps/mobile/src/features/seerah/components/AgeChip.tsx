import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors } from '@/shared/ui';

import { ageText, eraText } from '../format';

const CALENDAR = { ios: 'calendar', android: 'calendar_month' } as const;

/**
 * The age of an event on its page: «عمره ٥٤ سنة» with the Hijri year as a small detail («٢ هـ», «١٣ ق.هـ»). Hijri years are
 * never the primary label. A tap shows the age on the map. An event whose age the book does not state shows «العمر غير محدد»
 * on a dashed edge and does nothing. 44 pt tall.
 */
export function AgeChip({
  age,
  onPress,
  testID = 'seerah-age-chip',
}: {
  /** Null for the «غير محدد» bucket. */
  age: number | null;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const unspecified = age === null;
  const era = unspecified ? null : eraText(t, age);
  const label = unspecified
    ? t('seerah.age.unspecified')
    : era === null
      ? t('seerah.event.ageChipLabelPlain', { age: ageText(t, age) })
      : t('seerah.event.ageChipLabel', { age: ageText(t, age), era });

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={unspecified ? 'text' : 'button'}
      disabled={unspecified}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.chipPanel,
        borderStyle: unspecified ? 'dashed' : 'solid',
        borderWidth: unspecified ? theme.stroke.focus : theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[2],
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.size.chipPaddingX,
      }}
      testID={testID}
    >
      <Icon color={theme.colors.brand} name={CALENDAR} size={theme.size.iconSm} />
      <UiText variant="subhead" weight={500}>
        {unspecified ? t('seerah.age.unspecified') : ageText(t, age)}
      </UiText>
      {era === null ? null : (
        <View>
          <UiText testID={`${testID}-era`} tone="muted" variant="caption">
            {era}
          </UiText>
        </View>
      )}
    </Pressable>
  );
}
