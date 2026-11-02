import {
  act,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Dimensions, I18nManager } from "react-native";

import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";

// The user database is not open under Jest; Home's recent listens are empty.
jest.mock("@/features/audio/data/downloads", () => ({
  ...jest.requireActual("@/features/audio/data/downloads"),
  useDoneCountsByReciter: () => ({}),
  useVerifyNeededCounts: () => ({}),
}));

jest.mock("@/features/audio/data/recent-listens-hooks", () => ({
  useRecentListens: () => ({ data: [] }),
}));

// The user database is not open under Jest; the My Quran tab reads empty saved-item lists.
jest.mock("@/features/library/data/hooks", () => ({
  ...jest.requireActual("@/features/library/data/hooks"),
  useBookmarks: () => ({ data: [] }),
  useAllHighlights: () => ({ data: [] }),
  useAllNotes: () => ({ data: [] }),
}));

// The user database is not open under Jest; Home's khatma card reads no active plan or marker.
jest.mock("@/features/khatma/data/hooks", () => ({
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
  useKhatmaMarkerVerseId: () => null,
}));

// The Azkar cards read the content database, which is not open under Jest; the menu tab mounts here.
jest.mock("@/features/azkar/data", () => ({
  ...jest.requireActual("@/features/azkar/data"),
  useAzkarAvailable: () => false,
  useContinueAzkar: () => null,
  useRecentAzkarItems: () => [],
  useSessionCategoryProgress: () => [],
}));

jest.mock("@/core/sync/useStaleContent", () => ({
  useStaleContent: jest.fn(() => false),
}));

jest.mock("expo-symbols", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SymbolView: ({ name }: { name: { ios: string; android: string } }) =>
      createElement(View, { name, testID: "sidebar-symbol" } as ComponentProps<
        typeof View
      >),
  };
});

function setWidth(width: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height: 800, scale: 1, width },
    window: { fontScale: 1, height: 800, scale: 1, width },
  });
}

// Each file renders the whole app (renderRouter("./app")); the first render pays the cold start under Jest.
jest.setTimeout(15_000);

// A pushed screen's back button pops when there is history, and replaces itself with its parent when there is none
// (developer request, 2 Nov 2026), so a deep link or widget launch never strands the user.
describe("back buttons on pushed screens", () => {
  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
    storage.set(storageKeys.onboardingCompleted, true);
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
    setWidth(390);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("pops back to the Menu the pushed Salah screen came from", async () => {
    const view = await renderRouter("./app");

    await act(async () => {
      router.navigate("/(main)/(menu)");
    });
    await act(async () => {
      router.push("/salah");
    });
    expect(view.getSegments()).toEqual(["salah"]);

    await act(async () => {
      fireEvent.press(screen.getByTestId("salah-header-back"));
    });

    expect(view.getSegments()).toEqual(["(main)", "(menu)"]);
  });

  it("falls back to the parent tab when the screen was opened with no history", async () => {
    const view = await renderRouter("./app");
    jest.spyOn(router, "canGoBack").mockReturnValue(false);

    await act(async () => {
      router.navigate("/salah");
    });
    expect(view.getSegments()).toEqual(["salah"]);

    await act(async () => {
      fireEvent.press(screen.getByTestId("salah-header-back"));
    });

    expect(view.getSegments()).toEqual(["(main)", "(menu)"]);
  });
});
