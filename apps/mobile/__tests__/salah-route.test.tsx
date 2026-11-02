import {
  act,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Dimensions, I18nManager } from "react-native";

import { locales } from "../jest/render-ui";

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

// The الصلاة route sits in the root stack, outside the tabs (app/salah/index.tsx). On an expanded window it keeps the
// sidebar through its own shell (app/salah/_layout.tsx, ADR 0032 amendment).
describe.each(locales)("salah route in %s", (locale) => {
  beforeEach(async () => {
    // Without this, "/" redirects to onboarding, which covers the tabs and the sidebar.
    storage.set(storageKeys.onboardingCompleted, true);
    storage.set(storageKeys.locale, locale);
    I18nManager.isRTL = locale === "ar";
    await i18n.changeLanguage(locale);
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

  it("renders no sidebar at /salah on a compact window", async () => {
    setWidth(390);
    await renderRouter("./app");

    await act(async () => {
      router.navigate("/salah");
    });

    expect(screen.getByTestId("screen-salah")).toBeOnTheScreen();
    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  it("opens the Salah screen from the expanded sidebar, with the sidebar kept and Prayer selected", async () => {
    setWidth(390);
    const view = await renderRouter("./app");

    await act(async () => {
      setWidth(900);
    });

    expect(screen.getByTestId("sidebar-salah")).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId("sidebar-salah"));
    });

    expect(view.getSegments()).toEqual(["salah"]);
    expect(screen.getByTestId("screen-salah")).toBeOnTheScreen();
    expect(screen.getByTestId("sidebar")).toBeOnTheScreen();
    expect(screen.getByTestId("sidebar-salah").props.accessibilityState).toEqual({ selected: true });
  });

  it("opens Qibla from the Salah screen inside the Salah stack, keeping the sidebar on an expanded window", async () => {
    setWidth(900);
    const view = await renderRouter("./app");

    await act(async () => {
      router.navigate("/salah");
    });
    await act(async () => {
      router.push("/salah/qibla");
    });

    expect(view.getSegments()).toEqual(["salah", "qibla"]);
    expect(screen.getByTestId("sidebar")).toBeOnTheScreen();
    expect(screen.getByTestId("sidebar-salah").props.accessibilityState).toEqual({ selected: true });
  });

  it("keeps the sidebar with Prayer selected when /salah opens on an expanded window", async () => {
    setWidth(900);
    await renderRouter("./app");

    await act(async () => {
      router.navigate("/salah");
    });

    expect(screen.getByTestId("screen-salah")).toBeOnTheScreen();
    expect(screen.getByTestId("sidebar")).toBeOnTheScreen();
    expect(screen.getByTestId("sidebar-salah").props.accessibilityState).toEqual({ selected: true });
  });
});
