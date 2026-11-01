import {
  act,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Dimensions, I18nManager, Platform } from "react-native";
import { within } from "@testing-library/react-native";

import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";

// The user database is not open under Jest; Home's recent listens are empty.
// The user database is not open under Jest; the Listen tab (rendered by the tabs) reads no download counts.
jest.mock("@/features/audio/data/downloads", () => ({
  ...jest.requireActual("@/features/audio/data/downloads"),
  useDoneCountsByReciter: () => ({}),
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

describe("adaptive nav", () => {
  // The app starts in Arabic; these tests use the English labels, so they save English first (as a reader would).
  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
  });

  // Not the window width: resetting it here breaks the next render in this file (the tests set their own width).
  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps the active section when the window class switches between tabs and the sidebar", async () => {
    setWidth(390);
    const view = await renderRouter("./app");

    expect(view.getSegments()).toEqual(["(main)", "(home)"]);
    expect(screen.queryByTestId("sidebar")).not.toBeOnTheScreen();

    await act(async () => {
      router.navigate("/(main)/(mushaf)");
    });

    expect(view.getSegments()).toEqual(["(main)", "(mushaf)"]);

    await act(async () => {
      setWidth(700);
    });

    expect(view.getSegments()).toEqual(["(main)", "(mushaf)"]);
    expect(screen.queryByTestId("sidebar")).not.toBeOnTheScreen();

    await act(async () => {
      setWidth(900);
    });

    expect(view.getSegments()).toEqual(["(main)", "(mushaf)"]);
    expect(
      screen.getByTestId("sidebar-mushaf").props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen
        .getAllByTestId("sidebar-symbol")
        .map((symbol) => symbol.props.name),
    ).toEqual([
      { ios: "person.crop.circle", android: "account_circle" },
      { ios: "house", android: "home" },
      { ios: "book", android: "menu_book" },
      { ios: "headphones", android: "headphones" },
      // الصلاة joined the sidebar after الاستماع in Phase 5 (ADR 0030).
      { ios: "moon.stars", android: "mosque" },
      // The sidebar's pinned settings entry (step 1).
      { ios: "gearshape", android: "settings" },
    ]);

    await act(async () => {
      fireEvent.press(screen.getByTestId("sidebar-home"));
    });

    expect(view.getSegments()).toEqual(["(main)", "(home)"]);
    expect(screen.getByTestId("sidebar-home").props.accessibilityState).toEqual(
      { selected: true },
    );

    await act(async () => {
      setWidth(390);
    });

    expect(view.getSegments()).toEqual(["(main)", "(home)"]);
    expect(screen.queryByTestId("sidebar")).not.toBeOnTheScreen();
  });

});

describe("android floating tab bar (ADR 0033)", () => {
  const originalOs = Platform.OS;

  function setPlatform(os: Platform["OS"]): void {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
  }

  // The root waits for fonts and the content database before it draws, so a render is only ready once the shell is.
  async function renderMain(width: number) {
    setWidth(width);
    const view = await renderRouter("./app");
    await screen.findByTestId("main-shell");
    return view;
  }

  function floatingBar() {
    return screen.getByTestId("floating-tab-bar");
  }

  beforeEach(async () => {
    setPlatform("android");
    storage.set(storageKeys.locale, "en");
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
  });

  // Each test sets its own width in renderMain. Resetting the width in afterEach breaks the next render.
  afterEach(() => {
    setPlatform(originalOs);
  });

  it("draws the five tabs in order, with the destination test IDs", async () => {
    await renderMain(390);

    expect(within(floatingBar()).getAllByRole("tab").map((tab) => tab.props.testID)).toEqual([
      "home",
      "mushaf",
      "my-quran",
      "listen",
      "menu",
    ]);
    expect(within(floatingBar()).getByRole("tab", { name: "Mushaf" })).toBeOnTheScreen();
    expect(within(floatingBar()).getByRole("tab", { name: "Menu" })).toBeOnTheScreen();
  });

  it("follows navigation: the tab of the current route is the selected one", async () => {
    const view = await renderMain(390);

    expect(within(floatingBar()).getByTestId("home").props.accessibilityState).toEqual({ selected: true });

    await act(async () => {
      router.navigate("/(main)/(mushaf)");
    });

    expect(view.getSegments()).toEqual(["(main)", "(mushaf)"]);
    expect(within(floatingBar()).getByTestId("mushaf").props.accessibilityState).toEqual({ selected: true });
    expect(within(floatingBar()).getByTestId("home").props.accessibilityState).toEqual({ selected: false });
  });

  it("switches to a tab when it is pressed", async () => {
    const view = await renderMain(390);

    await act(async () => {
      fireEvent.press(within(floatingBar()).getByRole("tab", { name: "Listen" }));
    });

    expect(view.getSegments()).toEqual(["(main)", "(listen)"]);
  });

  it("hides the floating bar on expanded windows, where the sidebar takes over", async () => {
    await renderMain(900);

    expect(screen.queryByTestId("floating-tab-bar")).toBeNull();
    expect(screen.getByTestId("sidebar")).toBeOnTheScreen();
  });

  it("keeps the Salah route reachable without a bar item, as the native tabs do", async () => {
    const view = await renderMain(390);

    expect(within(floatingBar()).queryByTestId("salah")).toBeNull();

    await act(async () => {
      router.navigate("/(main)/(salah)");
    });

    expect(view.getSegments()).toEqual(["(main)", "(salah)"]);
  });
});
