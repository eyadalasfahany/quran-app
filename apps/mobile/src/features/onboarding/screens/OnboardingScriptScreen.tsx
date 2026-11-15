import { type Href, router } from 'expo-router';
import { goBackOr } from '@/core/navigation/go-back';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ContentColumn } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { MushafPicker } from '@/features/reader/components/MushafPicker';
import type { MushafKey } from '@/features/reader/mushafs';
import { useReaderSettings } from '@/features/reader/settings';
import { MushafPreviewCard } from '@/features/onboarding/components/MushafPreviewCard';
import { OnboardingFooter } from '@/features/onboarding/components/OnboardingFooter';
import { OnboardingTopBar } from '@/features/onboarding/components/OnboardingTopBar';
import { Screen, UiText } from '@/shared/ui';

export function OnboardingScriptScreen({ testID = 'onboarding-script' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const savedMushaf = useReaderSettings((state) => state.mushaf);
  const setMushaf = useReaderSettings((state) => state.setMushaf);
  const [mushaf, setLocalMushaf] = useState<MushafKey>(savedMushaf);

  const continueNext = () => {
    setMushaf(mushaf);
    router.push('/(onboarding)/reciter');
  };

  return (
    <Screen testID={testID}>
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
            onBack={() => goBackOr('/(onboarding)/language' as Href)}
            onSkip={() => router.push('/(onboarding)/reciter')}
            skipLabel={t('onboarding.skip')}
          />
          <View style={{ gap: 6 }}>
            <UiText variant="displayMd">{t('onboarding.script.title')}</UiText>
            <UiText tone="muted" variant="subhead">
              {t('onboarding.script.subtitle')}
            </UiText>
          </View>
          <MushafPreviewCard />
          <MushafPicker
            accessibilityLabel={t('reader.mushafs.group')}
            onChange={setLocalMushaf}
            value={mushaf}
          />
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
