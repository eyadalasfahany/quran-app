import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { GlassSurface, UiText, useContrastColors } from '@/shared/ui';

// 'pill' is the phone sheet's floating glass bar; 'split' is the side panel's two outlined buttons.
export type AyahStepperVariant = 'pill' | 'split';

export function AyahStepper({
  variant,
  onPrevious,
  onNext,
  testID = 'ayah-stepper',
}: {
  variant: AyahStepperVariant;
  // Undefined at the first or last ayah, which disables that side.
  onPrevious?: () => void;
  onNext?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const previous = (
    <StepButton
      disabled={!onPrevious}
      label={t('reader.tafsir.previous')}
      onPress={() => onPrevious?.()}
      testID={`${testID}-previous`}
      variant={variant}
    />
  );
  const next = (
    <StepButton
      disabled={!onNext}
      label={t('reader.tafsir.next')}
      onPress={() => onNext?.()}
      testID={`${testID}-next`}
      variant={variant}
    />
  );

  if (variant === 'split') {
    return (
      <View style={{ flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
        {previous}
        {next}
      </View>
    );
  }

  // Floats over the sheet, centred, and never wider than half the sheet (the frame's shrink-to-fit).
  return (
    <View
      pointerEvents="box-none"
      style={{ alignItems: 'center', bottom: theme.size.pillInset, left: 0, position: 'absolute', right: 0 }}
      testID={testID}
    >
      <GlassSurface
        radius="pill"
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[1],
          maxWidth: '50%',
          padding: theme.space[1],
        }}
        testID={`${testID}-pill`}
      >
        {previous}
        <View
          style={{
            backgroundColor: colors.line,
            height: theme.size.stepDivider,
            width: theme.stroke.hairline,
          }}
        />
        {next}
      </GlassSurface>
    </View>
  );
}

function StepButton({
  label,
  disabled,
  onPress,
  variant,
  testID,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  variant: AyahStepperVariant;
  testID: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();
  const pill = variant === 'pill';
  const tone = disabled ? 'muted' : 'ink';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pill ? 'transparent' : disabled ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.pill,
        borderWidth: pill ? 0 : theme.stroke.hairline,
        flex: 1,
        justifyContent: 'center',
        minHeight: theme.size.controlHeight,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
      })}
      testID={testID}
    >
      <UiText align="center" scale="bar" tone={tone} variant={pill ? 'caption' : 'subhead'} weight={600}>
        {label}
      </UiText>
    </Pressable>
  );
}
