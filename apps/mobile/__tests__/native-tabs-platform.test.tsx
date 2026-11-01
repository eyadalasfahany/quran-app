import { renderRouter, screen } from "expo-router/testing-library";
import type { ComponentProps } from "react";
import { Dimensions, I18nManager, Platform } from "react-native";

import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";
import { themes } from "@/core/theme";

// Every prop NativeTabs receives, one entry per render. The iOS tab bar must stay exactly this (ADR 0033).
const mockNativeTabsProps: Record<string, unknown>[] = [];

// The native tab host is replaced by a View that records its props; its triggers render nothing.
jest.mock("expo-router/native-tabs", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const NativeTabs = ({ children, ...props }: { children?: unknown }) => {
    mockNativeTabsProps.push(props);
    return createElement(View, { testID: "native-tabs" }, children as never);
  };
  function Trigger() {
    return null;
  }
  function TriggerLabel() {
    return null;
  }
  function TriggerIcon() {
    return null;
  }
  return { NativeTabs: Object.assign(NativeTabs, { Trigger: Object.assign(Trigger, { Label: TriggerLabel, Icon: TriggerIcon }) }) };
});

// The user database is not open under Jest; Home's recent listens are empty.
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
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SymbolView: ({ name }: { name: { ios: string; android: string } }) =>
      createElement(View, { name, testID: "sidebar-symbol" } as ComponentProps<typeof View>),
  };
});

function setWidth(width: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height: 800, scale: 1, width },
    window: { fontScale: 1, height: 800, scale: 1, width },
  });
}

function setPlatform(os: Platform["OS"]): void {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

describe("main tabs by platform (ADR 0033)", () => {
  const originalOs = Platform.OS;

  // The root waits for fonts and the content database before it draws, so a render is only ready once the shell is.
  async function renderMain(width: number) {
    setWidth(width);
    await renderRouter("./app");
    await screen.findByTestId("main-shell");
  }

  beforeEach(async () => {
    mockNativeTabsProps.length = 0;
    storage.set(storageKeys.locale, "en");
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    setPlatform(originalOs);
  });

  describe("on iOS", () => {
    beforeEach(() => {
      setPlatform("ios");
    });

    it("renders NativeTabs and no floating bar", async () => {
      await renderMain(390);

      expect(screen.getByTestId("native-tabs")).toBeOnTheScreen();
      expect(screen.queryByTestId("floating-tab-bar")).toBeNull();
    });

    it("passes NativeTabs exactly the iOS tab bar props, with no Android-only props", async () => {
      await renderMain(390);

      const { colors, text } = themes.light;
      expect(mockNativeTabsProps.at(-1)).toEqual({
        backgroundColor: colors.glassFallback,
        hidden: false,
        iconColor: { default: colors.inkMuted, selected: colors.brand },
        labelStyle: {
          default: { color: colors.inkMuted, fontFamily: text.label.fontFamily, fontSize: text.label.fontSize },
          selected: { color: colors.brand, fontFamily: text.headline.fontFamily, fontSize: text.label.fontSize },
        },
        tintColor: colors.brand,
        unstable_nativeProps: { direction: "ltr" },
      });
    });

    it("hides the native bar on expanded windows, as before", async () => {
      await renderMain(900);

      expect(mockNativeTabsProps.at(-1)).toMatchObject({ hidden: true });
    });
  });

  describe("on Android", () => {
    beforeEach(() => {
      setPlatform("android");
    });

    it("renders the floating bar and never NativeTabs", async () => {
      await renderMain(390);

      expect(screen.getByTestId("floating-tab-bar")).toBeOnTheScreen();
      expect(screen.queryByTestId("native-tabs")).toBeNull();
      expect(mockNativeTabsProps).toHaveLength(0);
    });
  });
});
