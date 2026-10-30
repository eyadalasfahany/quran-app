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

  afterEach(() => {
    act(() => {
      setWidth(390);
    });
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
      { ios: "house", android: "home" },
      { ios: "book", android: "menu_book" },
      { ios: "headphones", android: "headphones" },
      { ios: "bookmark", android: "bookmark" },
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
