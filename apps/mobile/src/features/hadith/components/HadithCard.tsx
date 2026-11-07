import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Icon, type IconName } from '@/shared/ui';

import { formatHadithNumber } from '../format';
import type { HadithListItem } from '../types';

import { HadithNumberBadge } from './HadithNumberBadge';
import { HadithText } from './HadithText';

const BOOKMARK_FILLED: IconName = { ios: 'bookmark.fill', android: 'bookmark_added' };
const DEFAULT_LINES = 3;
const GAP = 12;
const PADDING = 16;

/** A hadith row in a book or chapter list: a pill number, a clamped preview and an optional saved glyph. */
export function HadithCard({
  item,
  saved = false,
  selected = false,
  numberOfLines = DEFAULT_LINES,
  chainEnd = null,
  onPress,
  testID = 'hadith-card',
}: {
  item: Pick<HadithListItem, 'hadithNumber' | 'textAr'>;
  saved?: boolean;
  selected?: boolean;
  numberOfLines?: number;
  chainEnd?: number | null;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const number = formatHadithNumber(item.hadithNumber, locale);
  const label = `${t('hadith.reader.numberLabel', { number })}, ${item.textAr}${saved ? `, ${t('hadith.saved.mark')}` : ''}`;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'flex-start',
        backgroundColor: selected ? theme.colors.glassSelected : theme.colors.surfaceRaised,
        borderRadius: theme.radius.lg,
        flexDirection: 'row',
        gap: GAP,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: PADDING,
      })}
      testID={testID}
    >
      <HadithNumberBadge number={item.hadithNumber} size="pill" testID={`${testID}-badge`} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <HadithText chainEnd={chainEnd} numberOfLines={numberOfLines} testID={`${testID}-text`} text={item.textAr} variant="preview" />
      </View>
      {saved ? (
        <Icon color={theme.colors.brand} name={BOOKMARK_FILLED} size={theme.size.iconLg} testID={`${testID}-saved`} />
      ) : null}
    </Pressable>
  );
}
