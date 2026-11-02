import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ReciterStyleTag } from '@/features/audio/components/ReciterStyleTag';
import { MiniPlayerProgressLine } from '@/features/audio/components/MiniPlayerProgressLine';
import { Icon, type IconName, UiText, useContrastColors } from '@/shared/ui';

import { AdhanPreviewButton } from './AdhanPreviewButton';

const CHECK: IconName = { ios: 'checkmark', android: 'check' };

export interface AdhanPreviewProps {
  playing: boolean;
  /** 0 to 1 through the clip; read only while `playing`. */
  progress: number;
  onToggle: () => void;
}

/**
 * One radio row of the adhan sound picker (quran-app-screens.html, #AdhanSoundPicker): the name, the «الافتراضي» pill
 * on the default voice, a play button on the voices, a check when selected, and a progress line while it previews.
 *
 * The selectable area is one Pressable behind the content. The name, check and progress ignore touches, so a tap on them
 * selects the row, and the play button sits on top and takes its own touches (a button inside the radio would be hidden
 * from VoiceOver by its accessible parent).
 */
export function AdhanSoundRow({
  name,
  selected,
  isDefault = false,
  preview,
  separator = true,
  onSelect,
  testID,
}: {
  name: string;
  selected: boolean;
  /** The default voice shows the «الافتراضي» pill. */
  isDefault?: boolean;
  /** Voices only. System and silent rows pass nothing and keep a 44 pt spacer, as in the frame. */
  preview?: AdhanPreviewProps;
  /** The hairline under the row; the last row of the card has none. */
  separator?: boolean;
  onSelect: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const touchTarget = theme.size.touchTarget;

  return (
    <View
      style={{
        borderBottomColor: colors.line,
        borderBottomWidth: separator ? theme.stroke.hairline : 0,
        position: 'relative',
      }}
    >
      <Pressable
        accessibilityLabel={name}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onSelect}
        style={({ pressed }) => [StyleSheet.absoluteFill, { backgroundColor: pressed ? theme.colors.fillSecondary : 'transparent' }]}
        testID={testID}
      />
      <View
        pointerEvents="box-none"
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: 56,
          paddingEnd: theme.space[2],
          paddingStart: theme.space[4],
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: theme.space[2], minWidth: 0 }}
        >
          <UiText tone="ink" variant="body" weight={selected ? 600 : 400}>
            {name}
          </UiText>
          {isDefault ? <ReciterStyleTag label={t('salah.adhanSound.default')} testID={testID ? `${testID}-default` : undefined} /> : null}
        </View>
        {preview ? (
          <AdhanPreviewButton
            name={name}
            onPress={preview.onToggle}
            playing={preview.playing}
            testID={testID ? `${testID}-preview` : undefined}
          />
        ) : (
          <View pointerEvents="none" style={{ height: touchTarget, width: touchTarget }} />
        )}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{ alignItems: 'center', height: 28, justifyContent: 'center', width: 28 }}
        >
          {selected ? <Icon color={theme.colors.brand} name={CHECK} size={20} testID={testID ? `${testID}-check` : undefined} /> : null}
        </View>
      </View>
      {preview?.playing ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{ bottom: 0, end: 0, position: 'absolute', start: 0 }}
        >
          <MiniPlayerProgressLine fraction={preview.progress} placement="inline" />
        </View>
      ) : null}
    </View>
  );
}
