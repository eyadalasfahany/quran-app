import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { GlassSurface, Icon, UiText } from '@/shared/ui';

const UP = { ios: 'chevron.up', android: 'keyboard_arrow_up' } as const;
const DOWN = { ios: 'chevron.down', android: 'keyboard_arrow_down' } as const;
const PLAY = { ios: 'play.fill', android: 'play_arrow' } as const;
const REPEAT = { ios: 'repeat', android: 'repeat' } as const;
const MEMORIZE = { ios: 'eye.slash', android: 'visibility_off' } as const;

// The Focus frame (quran-app-screens.html, #Focus): every control is 52 tall. Labelled controls pad 14 and
// space their icon and label 6. The bar pads and spaces its controls 4 (space[1]). Step controls are 44 wide.
const CONTROL = 52;
const LABELLED_PADDING = 14;
const LABELLED_GAP = 6;
// The frame's labels are 13 px at weight 600.
const LABEL_WEIGHT = 600;

export function FocusTransport({
  onPrevious,
  onNext,
  testID = 'focus-transport',
}: {
  onPrevious?: () => void;
  onNext?: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const ink = theme.colors.ink;
  const labelled = {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LABELLED_GAP,
    height: CONTROL,
    paddingHorizontal: LABELLED_PADDING,
  } as const;
  const step = { alignItems: 'center', height: CONTROL, justifyContent: 'center', width: theme.size.touchTarget } as const;
  const labelStyle = { lineHeight: theme.size.focusLabelLineHeight };

  return (
    <GlassSurface radius="pill" style={{ alignSelf: 'center' }} testID={testID}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1], padding: theme.space[1] }}>
        <Pressable accessibilityLabel={t('reader.focus.repeat')} accessibilityRole="button" style={labelled} testID={`${testID}-repeat`}>
          <Icon color={ink} name={REPEAT} size={theme.size.iconMd} />
          <UiText scale="bar" style={labelStyle} variant="caption" weight={LABEL_WEIGHT}>
            {t('reader.focus.repeatShort', { count: formatNumber(3, locale) })}
          </UiText>
        </Pressable>
        <Pressable
          accessibilityLabel={t('reader.focus.previous')}
          accessibilityRole="button"
          disabled={onPrevious === undefined}
          onPress={onPrevious}
          style={step}
          testID={`${testID}-previous`}
        >
          <Icon color={ink} name={UP} size={theme.size.icon} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('reader.focus.play')}
          accessibilityRole="button"
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.brand,
            borderRadius: theme.radius.pill,
            height: CONTROL,
            justifyContent: 'center',
            width: CONTROL,
          }}
          testID={`${testID}-play`}
        >
          <Icon color={theme.colors.onBrand} name={PLAY} size={theme.size.icon} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('reader.focus.next')}
          accessibilityRole="button"
          disabled={onNext === undefined}
          onPress={onNext}
          style={step}
          testID={`${testID}-next`}
        >
          <Icon color={ink} name={DOWN} size={theme.size.icon} />
        </Pressable>
        <Pressable accessibilityLabel={t('reader.focus.memorize')} accessibilityRole="button" style={labelled} testID={`${testID}-memorize`}>
          <Icon color={ink} name={MEMORIZE} size={theme.size.iconMd} />
          {/* The label breaks where the frame breaks it, so the control is only as wide as its widest line. */}
          <UiText align="center" scale="bar" style={labelStyle} variant="caption" weight={LABEL_WEIGHT}>
            {t('reader.focus.memorizeLabel')}
          </UiText>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
