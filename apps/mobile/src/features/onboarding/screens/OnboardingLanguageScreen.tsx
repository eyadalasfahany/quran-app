import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { setLocale, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { OnboardingFooter } from '@/features/onboarding/components/OnboardingFooter';
import { OnboardingHeroPattern } from '@/features/onboarding/components/OnboardingHeroPattern';
import { suggestLocale } from '@/features/onboarding/suggest-locale';
import { OnboardingRadioCard, Screen, UiText } from '@/shared/ui';

export function OnboardingLanguageScreen({ testID = 'onboarding-language' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [locale, setLocalLocale] = useState<Locale>(() => suggestLocale());

  const continueNext = () => {
    setLocale(locale);
    router.push('/(onboarding)/script');
  };

  return (
    <Screen testID={testID}>
      <OnboardingHeroPattern />
      <View
        style={{
          flex: 1,
          gap: theme.space[4],
          marginTop: -theme.space[8],
          paddingHorizontal: theme.space[6],
        }}
      >
        <View style={{ alignItems: 'center', gap: 6 }}>
          <UiText align="center" variant="displayLg">
            {t('onboarding.language.title')}
          </UiText>
          <UiText align="center" tone="muted" variant="body">
            {t('onboarding.language.tagline')}
          </UiText>
          <UiText align="center" tone="muted" variant="caption">
            {t('onboarding.language.taglineEn')}
          </UiText>
        </View>
        <View
          accessibilityLabel={t('onboarding.language.groupLabel')}
          accessibilityRole="radiogroup"
          style={{ gap: theme.space[2] }}
        >
          <OnboardingRadioCard
            detail={t('onboarding.language.arabicDetail')}
            onPress={() => setLocalLocale('ar')}
            selected={locale === 'ar'}
            testID="onboarding-locale-ar"
            title={t('onboarding.language.arabic')}
          />
          <OnboardingRadioCard
            detail={t('onboarding.language.englishDetail')}
            onPress={() => setLocalLocale('en')}
            selected={locale === 'en'}
            testID="onboarding-locale-en"
            title={t('onboarding.language.english')}
          />
        </View>
      </View>
      <OnboardingFooter
        continueLabel={t('onboarding.continue')}
        onContinue={continueNext}
        step={1}
        stepLabel={t('onboarding.stepOfThree', { step: 1, total: 3 })}
      />
    </Screen>
  );
}
