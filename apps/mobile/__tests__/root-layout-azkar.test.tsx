import { act, renderRouter } from "expo-router/testing-library";
import { I18nManager, Platform } from "react-native";
import * as reanimated from "react-native-reanimated";
import type { ReactNode } from "react";

import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";
import { sheetScreenOptions } from "@/features/reader/form-sheet";

// Wraps the root Stack so the test can read the Stack.Screen entries the root layout registers.
const mockRecordStack = jest.fn();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const actual =
    jest.requireActual<typeof import("expo-router")>("expo-router");
  const RecordingStack = (props: { children?: ReactNode }) => {
    mockRecordStack(React.Children.toArray(props.children));
    return React.createElement(actual.Stack, props as never);
  };
  return {
    ...actual,
    Stack: Object.assign(RecordingStack, { Screen: actual.Stack.Screen }),
  };
});

// The user database is not open under Jest; Home's recent listens are empty.
// The user database is not open under Jest; the Listen tab (rendered by the tabs) reads no download counts.
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

const AZKAR_PUSH = ["azkar/index", "azkar/category/[id]", "azkar/search", "azkar/favorites", "azkar/downloads"];
const AZKAR_MODAL = ["azkar/read/[categoryId]", "azkar/entry/[entryKey]"];

type RegisteredScreen = { name: string; options: Record<string, unknown> };

/**
 * The Stack.Screen entries from the most recent render of the root Stack. Other layouts render their own Stack,
 * so the root is the latest one that registers the sheets.
 */
function registeredScreens(): Map<string, Record<string, unknown>> {
  const byName = new Map<string, Record<string, unknown>>();
  const rootRender = [...mockRecordStack.mock.calls]
    .reverse()
    .map((call) => call[0] as { props: RegisteredScreen }[])
    .find((children) => children.some((child) => child.props.name === "reader-settings"));
  for (const child of rootRender ?? []) {
    byName.set(child.props.name, child.props.options);
  }
  return byName;
}

function setPlatform(os: (typeof Platform)["OS"]): void {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

// Each file renders the whole app (renderRouter("./app")); the first render pays the cold start under Jest, which takes more than 5 s when the suites run in parallel.
jest.setTimeout(15_000);

describe("root layout Azkar screens", () => {
  const originalOs = Platform.OS;
  // Full app router mounts are slow on Windows CI hosts.
  jest.setTimeout(120_000);

  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
    I18nManager.isRTL = false;
    jest.spyOn(reanimated, "useReducedMotion").mockReturnValue(false);
    mockRecordStack.mockClear();
    setPlatform("android");
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalOs,
    });
    I18nManager.isRTL = false;
    jest.restoreAllMocks();
  });

  async function renderAt(): Promise<void> {
    await renderRouter("./app");
    await act(async () => {});
  }

  it("slides Android Azkar push screens in from the right in LTR", async () => {
    await renderAt();

    const screens = registeredScreens();
    for (const name of AZKAR_PUSH) {
      expect(screens.get(name)).toEqual({
        animation: "slide_from_right",
        gestureEnabled: true,
      });
    }
  });

  it("slides Android Azkar push screens in from the left in RTL", async () => {
    I18nManager.isRTL = true;
    await renderAt();

    const screens = registeredScreens();
    for (const name of AZKAR_PUSH) {
      expect(screens.get(name)).toEqual({
        animation: "slide_from_left",
        gestureEnabled: true,
      });
    }
  });

  it("keeps the native push on iOS in both directions", async () => {
    setPlatform("ios");
    I18nManager.isRTL = true;
    await renderAt();

    const screens = registeredScreens();
    for (const name of AZKAR_PUSH) {
      expect(screens.get(name)).toEqual({
        animation: "default",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      });
    }
  });

  it("rises the focused reader from the bottom, with a vertical swipe on iOS", async () => {
    setPlatform("ios");
    await renderAt();

    const screens = registeredScreens();
    for (const name of AZKAR_MODAL) {
      expect(screens.get(name)).toEqual({
        animation: "slide_from_bottom",
        gestureDirection: "vertical",
        gestureEnabled: true,
      });
    }
  });

  it("rises the focused reader from the bottom on Android", async () => {
    await renderAt();

    const screens = registeredScreens();
    for (const name of AZKAR_MODAL) {
      expect(screens.get(name)).toEqual({
        animation: "slide_from_bottom",
        gestureEnabled: true,
      });
    }
  });

  it("fades every Azkar screen when Reduce Motion is on", async () => {
    jest.spyOn(reanimated, "useReducedMotion").mockReturnValue(true);
    await renderAt();

    const screens = registeredScreens();
    for (const name of [...AZKAR_PUSH, ...AZKAR_MODAL]) {
      expect(screens.get(name)?.animation).toBe("fade");
    }
  });

  it("registers Misbaha as a pushed screen and the daily goals as a sheet", async () => {
    await renderAt();

    expect(registeredScreens().get("sibha")).toEqual({
      animation: "slide_from_right",
      gestureEnabled: true,
    });
    expect(registeredScreens().get("daily-goals")).toEqual(sheetScreenOptions);
  });

  it("registers the Azkar reminder sheet with the sheet options", async () => {
    await renderAt();

    expect(registeredScreens().get("azkar/reminders")).toEqual(sheetScreenOptions);
  });

  it("leaves the sheet registrations unchanged", async () => {
    await renderAt();

    expect(registeredScreens().get("reader-settings")).toEqual(
      sheetScreenOptions,
    );
    expect(registeredScreens().get("azkar/details/[entryKey]")).toEqual(
      sheetScreenOptions,
    );
  });
});
