import { act, renderHook } from "@testing-library/react-native";

import { useOnline } from "@/core/network/useOnline";
import { installResource, runDeviceContentSync } from "@/core/sync";
import {
  resetHadithDownloads,
  useHadithDownloads,
} from "@/features/hadith/downloads";

import { useSeerahDownload } from "./useSeerahDownload";

jest.mock("@/core/network/useOnline", () => ({
  useOnline: jest.fn(() => true),
}));
jest.mock("@/core/sync", () => ({
  installResource: jest.fn(() => new Promise(() => undefined)),
  runDeviceContentSync: jest.fn(() => Promise.resolve()),
}));

const ENTRY = {
  installed: false,
  packSizeBytes: 1024,
  resourceId: 5,
  version: 1,
};

describe("useSeerahDownload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHadithDownloads();
    (useOnline as jest.Mock).mockReturnValue(true);
  });

  it("shows a listed, not installed, idle pack as downloading at 0 when online", async () => {
    expect(
      (await renderHook(() => useSeerahDownload(ENTRY))).result.current.view,
    ).toEqual({ kind: "downloading", progress: 0 });
  });

  it("shows an installed pack with nothing to read as the error, never a spinner", async () => {
    expect(
      (await renderHook(() => useSeerahDownload({ ...ENTRY, installed: true })))
        .result.current.view,
    ).toEqual({ kind: "error" });
  });

  it("says offline without a connection, and an error without an entry while online", async () => {
    (useOnline as jest.Mock).mockReturnValue(false);
    expect(
      (await renderHook(() => useSeerahDownload(ENTRY))).result.current.view
        .kind,
    ).toBe("offline");
    expect(
      (await renderHook(() => useSeerahDownload(undefined))).result.current.view
        .kind,
    ).toBe("offline");
    (useOnline as jest.Mock).mockReturnValue(true);
    expect(
      (await renderHook(() => useSeerahDownload(undefined))).result.current.view
        .kind,
    ).toBe("error");
  });

  it("re-syncs the catalogue from the error when there is no entry, and installs nothing", async () => {
    const { result } = await renderHook(() => useSeerahDownload(undefined));
    await act(async () => {
      result.current.start();
    });
    expect(runDeviceContentSync).toHaveBeenCalledTimes(1);
    expect(installResource).not.toHaveBeenCalled();
  });

  it("does not re-sync the catalogue when the entry is there", async () => {
    const { result } = await renderHook(() => useSeerahDownload(ENTRY));
    await act(async () => {
      result.current.start();
    });
    expect(runDeviceContentSync).not.toHaveBeenCalled();
    expect(installResource).toHaveBeenCalledTimes(1);
  });

  it("starts the install for the entry and reports its progress", async () => {
    const { result } = await renderHook(() => useSeerahDownload(ENTRY));
    await act(async () => {
      result.current.start();
    });
    expect(installResource).toHaveBeenCalledWith(5, expect.anything());
    expect(result.current.view).toEqual({ kind: "downloading", progress: 0 });
  });

  it("starts over any network and has no cancel", async () => {
    const original = useHadithDownloads.getState().start;
    const start = jest.fn(original);
    useHadithDownloads.setState({ start });
    try {
      const { result } = await renderHook(() => useSeerahDownload(ENTRY));
      await act(async () => {
        result.current.start();
      });
      expect(start).toHaveBeenCalledWith(5, { anyNetwork: true });
      expect(result.current).not.toHaveProperty("cancel");
    } finally {
      useHadithDownloads.setState({ start: original });
    }
  });

  it("shows a failed install as an error, or offline when the network was the reason", async () => {
    const { result } = await renderHook(() => useSeerahDownload(ENTRY));
    await act(async () => {
      useHadithDownloads.setState({
        byId: { 5: { progress: 0, status: "failed" } },
      });
    });
    expect(result.current.view.kind).toBe("error");
    await act(async () => {
      useHadithDownloads.setState({
        byId: { 5: { progress: 0, reason: "network", status: "failed" } },
      });
    });
    expect(result.current.view.kind).toBe("offline");
  });

  it("does nothing without an entry", async () => {
    const { result } = await renderHook(() => useSeerahDownload(undefined));
    await act(async () => result.current.start());
    expect(installResource).not.toHaveBeenCalled();
  });
});
