import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import type { ReaderMode } from '@/features/reader/anchor/reading-anchor';
import { useReaderSettings } from '@/features/reader/settings';
import { OnboardingFooter } from '@/features/onboarding/components/OnboardingFooter';
import { OnboardingTopBar } from '@/features/onboarding/components/OnboardingTopBar';
import { ScriptPreviewCard } from '@/features/onboarding/components/ScriptPreviewCard';
import { OnboardingRadioCard, Screen, UiText } from '@/shared/ui';

const MODES: ReaderMode[] = ['mushaf', 'reading', 'focus'];

export function OnboardingScriptScreen({ testID = 'onboarding-script' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const savedMode = useReaderSettings((state) => state.mode);
  const setMode = useReaderSettings((state) => state.setMode);
  const [mode, setLocalMode] = useState<ReaderMode>(savedMode);

  const continueNext = () => {
    setMode(mode);
    router.push('/(onboarding)/reciter');
  };

  return (
    <Screen testID={testID}>
      {/* The column caps the content at 720 on wide windows (spec §4). Its gutter is 0: the phone layout keeps its own padding. */}
      <ContentColumn gutter={0} testID={`${testID}-column`}>
        <ScrollView
          contentContainerStyle={{
            gap: theme.space[4],
            paddingBottom: theme.space[4],
            paddingHorizontal: theme.space[5],
            paddingTop: theme.space[6],
          }}
          style={{ flex: 1 }}
        >
          <OnboardingTopBar
            backLabel={t('onboarding.back')}
            onBack={() => router.back()}
            onSkip={() => router.push('/(onboarding)/reciter')}
            skipLabel={t('onboarding.skip')}
          />
          <View style={{ gap: 6 }}>
            <UiText variant="displayMd">{t('onboarding.script.title')}</UiText>
            <UiText tone="muted" variant="subhead">
              {t('onboarding.script.subtitle')}
            </UiText>
          </View>
          <ScriptPreviewCard mode={mode} />
          <View
            accessibilityLabel={t('onboarding.script.modeGroup')}
            accessibilityRole="radiogroup"
            style={{ gap: theme.space[2] }}
          >
            {MODES.map((key) => (
              <OnboardingRadioCard
                key={key}
                onPress={() => setLocalMode(key)}
                selected={mode === key}
                testID={`onboarding-mode-${key}`}
                title={t(`reader.settings.modes.${key}`)}
              />
            ))}
          </View>
        </ScrollView>
        <OnboardingFooter
          continueLabel={t('onboarding.continue')}
          onContinue={continueNext}
          step={2}
          stepLabel={t('onboarding.stepOfThree', { step: 2, total: 3 })}
        />
      </ContentColumn>
    </Screen>
  );
}
