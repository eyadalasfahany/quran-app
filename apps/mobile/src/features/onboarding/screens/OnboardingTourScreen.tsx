import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";

import { goBackOr } from "@/core/navigation/go-back";
import { ContentColumn } from "@/core/layout";
import { useTheme } from "@/core/theme";
import { MENU_DUAS_ICON } from "@/features/duas/components/MenuDuasCard";
import { useDuasAvailable } from "@/features/duas/data/hooks";
import { MENU_HADITH_ICON } from "@/features/hadith/components/MenuHadithCard";
import { useHadithHomeEntry } from "@/features/hadith/availability";
import { OnboardingFooter } from "@/features/onboarding/components/OnboardingFooter";
import { OnboardingTopBar } from "@/features/onboarding/components/OnboardingTopBar";
import { OnboardingTourTile } from "@/features/onboarding/components/OnboardingTourTile";
import { MENU_SEERAH_ICON } from "@/features/seerah/components/SeerahMenuCard";
import { useSeerahMenuCard } from "@/features/seerah/availability";
import { Screen, UiText, type IconName } from "@/shared/ui";

// Same SF Symbols and Material names as the Menu cards (MenuScreen ICON); Tools has no Menu card, so it takes a grid.
const ICON = {
  quran: { ios: "book", android: "menu_book" },
  listen: { ios: "headphones", android: "headphones" },
  prayer: { ios: "moon.stars", android: "mosque" },
  azkar: { ios: "circle.dotted", android: "scatter_plot" },
  hijri: { ios: "calendar", android: "calendar_month" },
  khatma: { ios: "checkmark.circle", android: "check_circle" },
  tools: { ios: "square.grid.2x2", android: "widgets" },
} as const satisfies Record<string, IconName>;

/** The tour's tile order (screens/frames/onboarding/OnboardTour). A hidden section drops its tile, as on the Menu. */
export function OnboardingTourScreen({
  testID = "onboarding-tour",
}: {
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const duasAvailable = useDuasAvailable();
  const hadithEntry = useHadithHomeEntry();
  const seerahCard = useSeerahMenuCard();

  const tiles = [
    {
      key: "quran",
      icon: ICON.quran,
      name: t("onboarding.tour.quran.name"),
      line: t("onboarding.tour.quran.line"),
      visible: true,
    },
    {
      key: "listen",
      icon: ICON.listen,
      name: t("onboarding.tour.listen.name"),
      line: t("onboarding.tour.listen.line"),
      visible: true,
    },
    {
      key: "prayer",
      icon: ICON.prayer,
      name: t("onboarding.tour.prayer.name"),
      line: t("onboarding.tour.prayer.line"),
      visible: true,
    },
    {
      key: "azkar",
      icon: ICON.azkar,
      name: t("onboarding.tour.azkar.name"),
      line: t("onboarding.tour.azkar.line"),
      visible: true,
    },
    {
      key: "duas",
      icon: MENU_DUAS_ICON,
      name: t("onboarding.tour.duas.name"),
      line: t("onboarding.tour.duas.line"),
      visible: duasAvailable,
    },
    {
      key: "hadith",
      icon: MENU_HADITH_ICON,
      name: t("onboarding.tour.hadith.name"),
      line: t("onboarding.tour.hadith.line"),
      visible: hadithEntry.menuCard,
    },
    {
      key: "seerah",
      icon: MENU_SEERAH_ICON,
      name: t("onboarding.tour.seerah.name"),
      line: t("onboarding.tour.seerah.line"),
      visible: seerahCard,
    },
    {
      key: "hijri",
      icon: ICON.hijri,
      name: t("onboarding.tour.hijri.name"),
      line: t("onboarding.tour.hijri.line"),
      // The Moon is always live, so this tile always shows (the Menu shows the Moon card on every device).
      visible: true,
    },
    {
      key: "khatma",
      icon: ICON.khatma,
      name: t("onboarding.tour.khatma.name"),
      line: t("onboarding.tour.khatma.line"),
      visible: true,
    },
    {
      key: "tools",
      icon: ICON.tools,
      name: t("onboarding.tour.tools.name"),
      line: t("onboarding.tour.tools.line"),
      visible: true,
    },
  ];

  return (
    <Screen testID={testID}>
      {/* The column caps the content at 720 on wide windows (spec §4). Its gutter is 0: the phone layout keeps its own padding. */}
      <ContentColumn gutter={0} testID={`${testID}-column`}>
        <ScrollView
          testID={`${testID}-scroll`}
          contentContainerStyle={{
            gap: theme.space[4],
            paddingBottom: theme.space[4],
            paddingHorizontal: theme.space[5],
            paddingTop: theme.space[6],
          }}
          style={{ flex: 1 }}
        >
          <OnboardingTopBar
            backLabel={t("onboarding.back")}
            onBack={() => goBackOr("/(onboarding)/language" as Href)}
            onSkip={() => router.push("/(onboarding)/reciter")}
            skipLabel={t("onboarding.skip")}
          />
          <View style={{ gap: 6 }}>
            <UiText variant="displayMd">{t("onboarding.tour.title")}</UiText>
            <UiText tone="muted" variant="subhead">
              {t("onboarding.tour.subtitle")}
            </UiText>
          </View>
          {/* Two columns: tiles wrap in pairs, and a hidden tile's place is taken by the next one. */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.space[3],
            }}
          >
            {tiles
              .filter((tile) => tile.visible)
              .map((tile) => (
                <View key={tile.key} style={{ width: "48%" }}>
                  <OnboardingTourTile
                    icon={tile.icon}
                    line={tile.line}
                    name={tile.name}
                    testID={`onboarding-tour-${tile.key}`}
                  />
                </View>
              ))}
          </View>
        </ScrollView>
        <OnboardingFooter
          continueLabel={t("onboarding.continue")}
          onContinue={() => router.push("/(onboarding)/script")}
          step={2}
          stepLabel={t("onboarding.stepOfFour", { step: 2, total: 4 })}
        />
      </ContentColumn>
    </Screen>
  );
}
