# 0016 — iOS 16.4 stays supported; Nitro is patched at install

Date: 2026-10-28 · Status: accepted · Amends the content plan (Preferences row), spec §14

## Context

TestFlight build 1.0.0 (2) aborted at launch on an iPad (5th generation), iPadOS 16.7.12, before any app code ran:

```
Termination Reason: DYLD 4 Symbol missing
Symbol not found: std::exception_ptr::__from_native_exception_pointer(void*)
Expected in: /usr/lib/libc++.1.dylib
```

Expo SDK 58's minimum is iOS 16.4, so the App Store offers the app to iOS 16.4–17 devices. Nitro 0.37.1 (under `react-native-mmkv` 4.3.2) has inline C++ helpers that Swift calls through C++ interop. They use `std::make_exception_ptr`, which Xcode 26's libc++ compiles to a symbol that exists only from iOS 18 (margelo/nitro#1652). Every iOS 16.4–17 device crashes the same way. Upstream's fix (throw + catch instead of `make_exception_ptr`) is only in nightlies, which also restructure the package.

## Decision

1. **The app keeps Expo's iOS 16.4 minimum.** Older iPads that stop at iOS 16 are a real audience for a Quran app; we don't raise the deployment target to 18.
2. **`apps/mobile/scripts/patch-nitro-exception-ptr.mjs` backports the upstream change on `postinstall`** (`ios/utils/RuntimeError.hpp`, `cpp/core/Promise.hpp`). It is a plain Node script: `patch-package` was last released more than 12 months ago.
3. The script fails the install when Nitro's source no longer matches, so an upgrade can't silently drop the fix. On the next Nitro upgrade, check whether the release contains the fix; if it does, delete the script and the `postinstall` entry.

## Consequences

- iOS 16.4–17 devices launch again. Not yet verified on a device: confirm on the iPad (5th generation) with the next TestFlight build, and check the built binary has no reference with `nm -um Taybah | grep from_native_exception_pointer`.
- An iOS 16 device joins the release device matrix (spec §14).
