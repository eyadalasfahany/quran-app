import { router } from "expo-router";
import { act, renderRouter, screen } from "expo-router/testing-library";
import type { AppStateStatus } from "react-native";
import { AppState, Dimensions, I18nManager, Platform } from "react-native";
import * as reanimated from "react-native-reanimated";
import type { ComponentProps } from "react";
import { waitFor } from "@testing-library/react-native";

import { getBootstrap } from "@/core/api";
import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";
import type { BootstrapResponse } from "@quran/api-contract";

// The real app on iOS, with the real router and the real useForceUpdate and ForceUpdateGate from app/_layout.tsx.
// Only the native version, the API client and the data-backed screens are mocked (as in back-navigation-route.test.tsx).

const mockApplication = { nativeApplicationVersion: "1.0.1" as string | null };

jest.mock("expo-application", () => ({
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
}));

jest.mock("@/core/api", () => ({
  ...jest.requireActual("@/core/api"),
  getBootstrap: jest.fn(),
}));

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
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SymbolView: ({ name }: { name: { ios: string; android: string } }) =>
      createElement(View, { name, testID: "sidebar-symbol" } as ComponentProps<typeof View>),
  };
});

const mockGetBootstrap = getBootstrap as jest.MockedFunction<typeof getBootstrap>;

const IOS_STORE = "https://apps.apple.com/app/id6828097265";
const ANDROID_STORE = "https://play.google.com/store/apps/details?id=com.taybahapp.taybah";
const CARD = "force-update-dialog-card";
// The card fades in, so until its animation ends it is hidden to the query, as a dialog is mid-open on a device.
const SHOWN = { includeHiddenElements: true } as const;

function bootstrap(minimumIos: string | null): BootstrapResponse {
  return {
    min_app_version: { ios: minimumIos, android: null },
    store_url: { ios: IOS_STORE, android: ANDROID_STORE },
  };
}

// The AppState listeners registered while the app is mounted. The test fires them, as iOS does on a foreground.
let appStateHandlers: ((state: AppStateStatus) => void)[] = [];

// Lets a check that awaits the API call finish, then flushes its state update.
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

// Returns to the foreground: fires every 'change' listener with 'active', then lets the checks finish.
async function foreground(): Promise<void> {
  await act(async () => {
    for (const handler of appStateHandlers) {
      handler("active");
    }
  });
  await settle();
}

function setWidth(width: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height: 800, scale: 1, width },
    window: { fontScale: 1, height: 800, scale: 1, width },
  });
}

function setPlatform(os: Platform["OS"]): void {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

// Each test renders the whole app; the first render pays the cold start under Jest.
jest.setTimeout(120_000);


const M = (x: string) => process.stdout.write("MARK " + x + "\n");
describe("tmp", () => {
  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
    storage.set(storageKeys.onboardingCompleted, true);
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
    setWidth(390);
    setPlatform("ios");
    mockApplication.nativeApplicationVersion = "1.0.1";
    jest.spyOn(reanimated, "useReducedMotion").mockReturnValue(true);
    appStateHandlers = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => { appStateHandlers.push(handler); return { remove: jest.fn() }; });
    mockGetBootstrap.mockReset();
  });
  it("another tab", async () => {
    M("a");
    mockGetBootstrap.mockResolvedValue(bootstrap("1.0.1"));
    await renderRouter("./app");
    M("b rendered");
    await screen.findByTestId("main-shell");
    M("c shell");
    await waitFor(() => expect(mockGetBootstrap).toHaveBeenCalledTimes(1));
    M("d launch check");
    await settle();
    M("e settled");
    expect(screen.queryByTestId(CARD, SHOWN)).toBeNull();
    await act(async () => { router.navigate("/(main)/(mushaf)"); });
    M("f navigated");
    mockGetBootstrap.mockResolvedValue(bootstrap("1.0.2"));
    await foreground();
    M("g foreground");
    expect(await screen.findByTestId(CARD, { ...SHOWN, timeout: 10_000 })).toBeOnTheScreen();
    M("h card");
  }, 60000);
});
