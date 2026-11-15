import { router } from "expo-router";
import { fireEvent, screen } from "@testing-library/react-native";

import { useDuasAvailable } from "@/features/duas/data/hooks";
import { useHadithHomeEntry } from "@/features/hadith/availability";
import { isHijriCalendarAvailable } from "@/features/hijri/data/hijri-date";
import { useSeerahMenuCard } from "@/features/seerah/availability";

import { flatStyle, locales, renderUi } from "../../../../jest/render-ui";
import { featureComponentLiterals } from "../../../../jest/ui-source";
import { resetWindowSize, setWindowSize } from "../../../../jest/window-size";

import { OnboardingTourScreen } from "./OnboardingTourScreen";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual<
    typeof import("react-native-safe-area-context")
  >("react-native-safe-area-context");
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock("@/features/duas/data/hooks", () => ({
  ...jest.requireActual<typeof import("@/features/duas/data/hooks")>(
    "@/features/duas/data/hooks",
  ),
  useDuasAvailable: jest.fn(),
}));
jest.mock("@/features/hadith/availability", () => ({
  ...jest.requireActual<typeof import("@/features/hadith/availability")>(
    "@/features/hadith/availability",
  ),
  useHadithHomeEntry: jest.fn(),
}));
jest.mock("@/features/seerah/availability", () => ({
  ...jest.requireActual<typeof import("@/features/seerah/availability")>(
    "@/features/seerah/availability",
  ),
  useSeerahMenuCard: jest.fn(),
}));
jest.mock("@/features/hijri/data/hijri-date", () => ({
  ...jest.requireActual<typeof import("@/features/hijri/data/hijri-date")>(
    "@/features/hijri/data/hijri-date",
  ),
  isHijriCalendarAvailable: jest.fn(),
}));

const ALWAYS_ON = ["quran", "listen", "prayer", "azkar", "khatma", "tools"];

describe("OnboardingTourScreen", () => {
  beforeEach(() => {
    jest.mocked(useDuasAvailable).mockReturnValue(true);
    jest
      .mocked(useHadithHomeEntry)
      .mockReturnValue({ menuCard: true } as ReturnType<
        typeof useHadithHomeEntry
      >);
    jest.mocked(useSeerahMenuCard).mockReturnValue(true);
    jest.mocked(isHijriCalendarAvailable).mockReturnValue(true);
    jest.mocked(router.push).mockClear();
    jest.mocked(router.replace).mockClear();
  });

  it.each(locales)(
    "renders the title and the always-on tiles in %s",
    async (locale) => {
      await renderUi(<OnboardingTourScreen />, { locale });

      expect(
        screen.getByText(locale === "ar" ? "ما في طيبة" : "What's in Taybah"),
      ).toBeOnTheScreen();
      for (const key of ALWAYS_ON) {
        expect(screen.getByTestId(`onboarding-tour-${key}`)).toBeOnTheScreen();
      }
    },
  );

  it("shows every tile when all sections are live", async () => {
    await renderUi(<OnboardingTourScreen />);

    for (const key of [...ALWAYS_ON, "duas", "hadith", "seerah", "hijri"]) {
      expect(screen.getByTestId(`onboarding-tour-${key}`)).toBeOnTheScreen();
    }
  });

  it.each([
    ["duas", useDuasAvailable],
    ["hadith", useHadithHomeEntry],
    ["seerah", useSeerahMenuCard],
  ] as const)(
    "drops the %s tile when its section is not live",
    async (key, hook) => {
      if (key === "hadith") {
        jest
          .mocked(useHadithHomeEntry)
          .mockReturnValue({ menuCard: false } as ReturnType<
            typeof useHadithHomeEntry
          >);
      } else {
        jest.mocked(hook as () => boolean).mockReturnValue(false);
      }
      await renderUi(<OnboardingTourScreen />);

      expect(screen.queryByTestId(`onboarding-tour-${key}`)).toBeNull();
      for (const other of ALWAYS_ON) {
        expect(
          screen.getByTestId(`onboarding-tour-${other}`),
        ).toBeOnTheScreen();
      }
    },
  );

  it("keeps the Hijri and Moon tile when the Hijri calendar is not available, because the Moon is", async () => {
    jest.mocked(isHijriCalendarAvailable).mockReturnValue(false);
    await renderUi(<OnboardingTourScreen />);

    expect(screen.getByTestId("onboarding-tour-hijri")).toBeOnTheScreen();
  });

  it("continues to the script screen", async () => {
    const view = await renderUi(<OnboardingTourScreen />);

    await fireEvent.press(view.getByTestId("onboarding-continue"));

    expect(router.push).toHaveBeenCalledWith("/(onboarding)/script");
  });

  it("goes back to the language screen when there is nothing to go back to", async () => {
    const view = await renderUi(<OnboardingTourScreen />);

    await fireEvent.press(view.getByTestId("onboarding-back"));

    expect(router.replace).toHaveBeenCalledWith("/(onboarding)/language");
  });

  it("skips to the reciter screen, as the script screen does", async () => {
    const view = await renderUi(<OnboardingTourScreen />);

    await fireEvent.press(view.getByTestId("onboarding-skip"));

    expect(router.push).toHaveBeenCalledWith("/(onboarding)/reciter");
  });

  it("shows step 2 of 4", async () => {
    await renderUi(<OnboardingTourScreen />, { locale: "en" });

    expect(screen.getByLabelText("Step 2 of 4")).toBeOnTheScreen();
  });

  it("caps the content in a 720 pt column on a 1366 pt window", async () => {
    setWindowSize(1366, 1024);
    try {
      const view = await renderUi(<OnboardingTourScreen />, { locale: "en" });

      expect(
        flatStyle(view.getByTestId("onboarding-tour-column").props.style),
      ).toMatchObject({ maxWidth: 720 });
    } finally {
      resetWindowSize();
    }
  });

  it("uses theme tokens only", () => {
    expect(
      featureComponentLiterals(
        "features/onboarding/screens/OnboardingTourScreen.tsx",
      ),
    ).toEqual([]);
  });
});
