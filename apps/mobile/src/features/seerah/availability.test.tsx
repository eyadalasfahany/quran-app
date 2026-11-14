import { renderHook } from "@testing-library/react-native";

import { useContentDb } from "@/core/db/content/open";

import { useSeerahMenuCard } from "./availability";
import { useSeerahAvailable, useSeerahCatalogEntry } from "./hooks";

jest.mock("@/core/db/content/open", () => ({ useContentDb: jest.fn() }));
jest.mock("./hooks", () => ({
  useSeerahAvailable: jest.fn(),
  useSeerahCatalogEntry: jest.fn(),
}));

const CATALOG = {
  installed: false,
  packSizeBytes: 1,
  resourceId: 1,
  version: 1,
};

describe("useSeerahMenuCard", () => {
  beforeEach(() => {
    (useContentDb as jest.Mock).mockReturnValue({ error: null, ready: true });
    (useSeerahAvailable as jest.Mock).mockReturnValue(false);
    (useSeerahCatalogEntry as jest.Mock).mockReturnValue(undefined);
  });

  it("is hidden with neither an installed pack nor a catalogue entry", async () => {
    expect((await renderHook(() => useSeerahMenuCard())).result.current).toBe(
      false,
    );
  });

  it("shows once the pack is installed", async () => {
    (useSeerahAvailable as jest.Mock).mockReturnValue(true);
    expect((await renderHook(() => useSeerahMenuCard())).result.current).toBe(
      true,
    );
  });

  it("shows when the synced catalogue lists the pack, so it can be downloaded", async () => {
    (useSeerahCatalogEntry as jest.Mock).mockReturnValue(CATALOG);
    expect((await renderHook(() => useSeerahMenuCard())).result.current).toBe(
      true,
    );
  });

  it("is hidden until content.db is ready", async () => {
    (useContentDb as jest.Mock).mockReturnValue({ error: null, ready: false });
    (useSeerahAvailable as jest.Mock).mockReturnValue(true);
    expect((await renderHook(() => useSeerahMenuCard())).result.current).toBe(
      false,
    );
  });
});
