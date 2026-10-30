import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

export type KhatmaStartChoice = 'lastRead' | 'beginning';

const RADIO = 20;
const RADIO_DOT = 10;
const RADIO_RING = 2;

export function KhatmaStartOptions({
  value,
  onChange,
  lastReadLabel,
  showLastRead = true,
  testID = 'khatma-start-options',
}: {
  value: KhatmaStartChoice;
  onChange: (choice: KhatmaStartChoice) => void;
  lastReadLabel: string;
  showLastRead?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  const options: { key: KhatmaStartChoice; label: string }[] = showLastRead
    ? [
        { key: 'lastRead', label: t('khatma.startLastRead', { place: lastReadLabel }) },
        { key: 'beginning', label: t('khatma.startBeginning') },
      ]
    : [{ key: 'beginning', label: t('khatma.startBeginning') }];

  return (
    <View style={{ gap: theme.space[2] }} testID={testID}>
      <UiText nativeID={`${testID}-label`} tone="muted" variant="caption">
        {t('khatma.startLabel')}
      </UiText>
      <View
        accessibilityLabel={t('khatma.startLabel')}
        accessibilityRole="radiogroup"
        style={{ gap: theme.space[2] }}
      >
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.key}
              onPress={() => onChange(option.key)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: selected ? theme.colors.brand : colors.line,
                borderRadius: theme.radius.lg,
                borderWidth: selected ? RADIO_RING : theme.stroke.hairline,
                flexDirection: 'row',
                gap: theme.space[3],
                minHeight: theme.size.touchTarget + theme.space[2],
                opacity: pressed ? theme.opacity.pressed : 1,
                paddingHorizontal: theme.space[4],
              })}
              testID={`${testID}-${option.key}`}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  alignItems: 'center',
                  borderColor: selected ? theme.colors.brand : colors.line,
                  borderRadius: RADIO / 2,
                  borderWidth: RADIO_RING,
                  height: RADIO,
                  justifyContent: 'center',
                  width: RADIO,
                }}
              >
                {selected ? (
                  <View
                    style={{
                      backgroundColor: theme.colors.brand,
                      borderRadius: RADIO_DOT / 2,
                      height: RADIO_DOT,
                      width: RADIO_DOT,
                    }}
                  />
                ) : null}
              </View>
              <UiText style={{ flex: 1 }} variant="body">
                {option.label}
              </UiText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
