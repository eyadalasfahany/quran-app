import {
  act,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Dimensions, I18nManager } from "react-native";

import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";

// Home's Duas block reads the user database through useMyDuas, which is not open under Jest; the Duas home block is hidden.
jest.mock("@/features/duas/data/hooks", () => ({
  ...jest.requireActual("@/features/duas/data/hooks"),
  useDuasAvailable: () => false,
  useMyDuas: () => [],
}));

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

// The الصلاة route sits in the root stack, outside the tabs (app/salah/index.tsx).
// Each file renders the whole app (renderRouter("./app")); the first render pays the cold start under Jest, which takes more than 5 s when the suites run in parallel.
jest.setTimeout(15_000);

describe("salah route", () => {
  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
    storage.set(storageKeys.onboardingCompleted, true);
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
  });

  it("renders the Salah screen at /salah inside the root stack", async () => {
    setWidth(390);
    const view = await renderRouter("./app");

    await act(async () => {
      router.navigate("/salah");
    });

    expect(view.getSegments()).toEqual(["salah"]);
    expect(screen.getByTestId("screen-salah")).toBeOnTheScreen();
  });

  it("opens the Salah screen on an expanded window, where the sidebar is gone (ADR 0051)", async () => {
    setWidth(390);
    const view = await renderRouter("./app");

    await act(async () => {
      setWidth(900);
    });

    expect(screen.queryByTestId("sidebar-salah")).not.toBeOnTheScreen();

    await act(async () => {
      router.navigate("/salah");
    });

    expect(view.getSegments()).toEqual(["salah"]);
    expect(screen.getByTestId("screen-salah")).toBeOnTheScreen();
  });

  it("opens Qibla from the Salah screen inside the Salah stack", async () => {
    setWidth(390);
    const view = await renderRouter("./app");

    await act(async () => {
      router.navigate("/salah");
    });
    await act(async () => {
      router.push("/salah/qibla");
    });

    expect(view.getSegments()).toEqual(["salah", "qibla"]);
  });
});
