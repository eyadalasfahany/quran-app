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

// The user database is not open under Jest; the reader's highlight hook gets an empty map.
jest.mock("@/features/library/data/hooks", () => ({
  ...jest.requireActual("@/features/library/data/hooks"),
  useHighlightsByVerseId: () => new Map(),
}));

describe("reader route", () => {
  // The app starts in Arabic; these tests use the English labels, so they save English first (as a reader would).
  beforeEach(async () => {
    storage.set(storageKeys.locale, "en");
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
  });

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
