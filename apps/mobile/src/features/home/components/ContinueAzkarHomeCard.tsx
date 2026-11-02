import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

const CHEVRON: IconName = { ios: 'chevron.right', android: 'chevron_right' };
const TRACK_HEIGHT = 4;
// The title is Amiri 22 (quran-app-screens.html, #Main «تابع الأذكار»). No display token has that size.
const TITLE_SIZE = 22;
const TITLE_LINE_HEIGHT = 29;
// The card's padding and the gap inside it (14 and 6 pt in the frame).
const CARD_PADDING_Y = 14;
const CARD_GAP = 6;

export type ContinueAzkarHomeResume = {
  caption: string;
  title: string;
  /** The count line, such as «٢ من ٣». */
  preview: string;
  /** 0 to 1. */
  progress: number;
};

/**
 * Home's «تابع الأذكار» card (quran-app-screens.html, #Main): a lighter surface card, not the brand card, so only «تابع
 * القراءة» is green (ADR 0034 §1). It resumes the reader at the first incomplete unit. Nothing is drawn with no resume.
 */
export function ContinueAzkarHomeCard({
  resume,
  onPress,
  testID = 'home-continue-azkar',
}: {
  resume: ContinueAzkarHomeResume | null;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  if (resume === null) {
    return null;
  }

  const fraction = Math.min(Math.max(resume.progress, 0), 1);

  return (
    <Pressable
      accessibilityLabel={t('common.a11yTriple', { label: resume.caption, title: resume.title, detail: resume.preview })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: CARD_PADDING_Y,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
        paddingVertical: CARD_PADDING_Y,
      })}
      testID={testID}
    >
      <View style={{ flex: 1, gap: CARD_GAP, minWidth: 0 }}>
        <UiText tone="muted" variant="caption">
          {resume.caption}
        </UiText>
        <UiText style={{ fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT }} testID={`${testID}-title`} variant="displaySm">
          {resume.title}
        </UiText>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <View
            style={{ backgroundColor: colors.line, borderRadius: TRACK_HEIGHT / 2, flex: 1, height: TRACK_HEIGHT, overflow: 'hidden' }}
          >
            <View
              style={{
                backgroundColor: theme.colors.goldOnBrandSurface,
                borderRadius: TRACK_HEIGHT / 2,
                height: TRACK_HEIGHT,
                width: `${Math.round(fraction * 100)}%`,
              }}
              testID={`${testID}-progress`}
            />
          </View>
          <UiText tone="muted" variant="caption">
            {resume.preview}
          </UiText>
        </View>
      </View>
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={theme.size.iconSm} />
    </Pressable>
  );
}
