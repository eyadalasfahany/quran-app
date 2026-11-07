import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { formatHadithNumber } from '../format';

import { HadithNumberBadge } from './HadithNumberBadge';

const GAP = 12;
const PADDING = 16;

/**
 * A placeholder row in a list: no source has this hadith yet. A slim card with the number and the note in the UI font,
 * muted. It stays tappable: it opens the reader, which shows the same note (ADR 0076).
 */
export function HadithUnavailableCard({
  hadithNumber,
  onPress,
  testID = 'hadith-unavailable-card',
}: {
  /** The display number, for example `'5709'` or `'5709–5712'`; formatted for the locale by the card. */
  hadithNumber: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const note = t('hadith.unavailable.title', { n: formatHadithNumber(hadithNumber, locale) });

  return (
    <Pressable
      accessibilityLabel={note}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderRadius: theme.radius.lg,
        flexDirection: 'row',
        gap: GAP,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: PADDING,
      })}
      testID={testID}
    >
      <HadithNumberBadge number={hadithNumber} size="pill" testID={`${testID}-badge`} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <UiText tone="muted" testID={`${testID}-note`} variant="label" weight={400}>
          {note}
        </UiText>
      </View>
    </Pressable>
  );
}
