import {
  act,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { router } from "expo-router";
import { I18nManager } from "react-native";

import { i18n } from "@/core/i18n";
import { storage, storageKeys } from "@/core/storage/mmkv";

// The widget snapshot sync is native-facing and has its own tests. Mounting it here costs the cold start past Jest's
// 5 s limit on the first route test, so the route test renders the root without it.
jest.mock("@/features/widgets/components/WidgetSnapshotSync", () => ({
  WidgetSnapshotSync: () => null,
}));

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

// The user database is not open under Jest; the reader's highlight hook gets an empty map,
// and the My Quran tab reads empty saved-item lists.
jest.mock("@/features/library/data/hooks", () => ({
  ...jest.requireActual("@/features/library/data/hooks"),
  useHighlightsByVerseId: () => new Map(),
  useBookmarks: () => ({ data: [] }),
  useAllHighlights: () => ({ data: [] }),
  useAllNotes: () => ({ data: [] }),
}));

// The user database is not open under Jest; the reader's khatma marker and Home's card read no plan.
// The Azkar cards read the content database, which is not open under Jest; the menu tab mounts here.
jest.mock("@/features/azkar/data", () => ({
  ...jest.requireActual("@/features/azkar/data"),
  useAzkarAvailable: () => false,
  useContinueAzkar: () => null,
  useRecentAzkarItems: () => [],
  useSessionCategoryProgress: () => [],
}));

jest.mock("@/features/khatma/data/hooks", () => ({
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
  useKhatmaMarkerVerseId: () => null,
}));

jest.mock("@/core/sync/useStaleContent", () => ({
  useStaleContent: jest.fn(() => false),
}));

describe("reader route", () => {
  // The app starts in Arabic; these tests use the English labels, so they save English first (as a reader would).
  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
    storage.set(storageKeys.onboardingCompleted, true);
    I18nManager.isRTL = false;
    await i18n.changeLanguage("en");
  });

  it("opens read/2:255 at that ayah and returns to the tab that opened it", async () => {
    const view = await renderRouter("./app");

    await act(async () => {
      router.navigate("/(main)/(mushaf)");
    });
    await act(async () => {
      router.push("/read/2:255");
    });

    expect(screen.getByTestId("reader-screen").props.accessibilityLabel).toBe(
      "2:255",
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("reader-back"));
    });

    expect(view.getSegments()).toEqual(["(main)", "(mushaf)"]);
  }, 15000); // The first test of the file pays the cold start of the whole app under Jest (serial run); 5 s is not enough.

  it("goes Home when the reader was opened with nothing under it (deep link or launch restore)", async () => {
    const view = await renderRouter("./app", { initialUrl: "/read/2:255" });

    await act(async () => {
      fireEvent.press(screen.getByTestId("reader-back"));
    });

    expect(view.getSegments()).toEqual(["(main)", "(home)"]);
  });

  it("opens the settings sheet and the ayah sheet from the reader", async () => {
    await renderRouter("./app");

    await act(async () => {
      router.push("/read/2:255");
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Reading settings"));
    });
    expect(screen.getByTestId("reader-settings-sheet")).toBeOnTheScreen();

    await act(async () => {
      router.back();
    });
    // The reader's list needs the content database, which Jest doesn't open; each row's More button is covered by ReadingAyahHeader.test.tsx.
    await act(async () => {
      router.push("/ayah/2:255");
    });

    expect(screen.getByTestId("sheet-container")).toBeOnTheScreen();
    expect(screen.getByText("2:255")).toBeOnTheScreen();
  });
});
