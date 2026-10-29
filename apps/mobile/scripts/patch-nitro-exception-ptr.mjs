// Runs on postinstall. Backports the fix for margelo/nitro#1652 (ADR 0016).
//
// Swift inlines Nitro's C++ helpers that call `std::make_exception_ptr`. With Xcode 26's libc++
// that compiles to `std::exception_ptr::__from_native_exception_pointer`, which exists only from
// iOS 18, so the app aborts at launch on iOS 16.4–17 ("DYLD Symbol missing"). Upstream replaced
// those calls with throw + catch in its nightlies; this applies the same change to the release we pin.
//
// Fails the install if Nitro's source no longer matches, so an upgrade can't silently drop the fix.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const nitroDir = dirname(require.resolve('react-native-nitro-modules/package.json'));

const PATCHES = [
  {
    file: 'ios/utils/RuntimeError.hpp',
    from: `  return std::make_exception_ptr(std::runtime_error(message));\n`,
    to:
      `  try {\n` +
      `    throw std::runtime_error(message);\n` +
      `  } catch (...) {\n` +
      `    return std::current_exception();\n` +
      `  }\n`,
  },
  {
    file: 'cpp/core/Promise.hpp',
    from: `      reject(std::make_exception_ptr(std::runtime_error(message)));\n`,
    to:
      `      try {\n` +
      `        throw std::runtime_error(message);\n` +
      `      } catch (...) {\n` +
      `        reject(std::current_exception());\n` +
      `      }\n`,
  },
];

for (const { file, from, to } of PATCHES) {
  const path = join(nitroDir, file);
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`patch-nitro-exception-ptr: ${file} not found. Check whether this Nitro release fixes nitro#1652 and update the script (ADR 0016).`);
  }

  if (source.includes(to)) {
    continue;
  }
  if (!source.includes(from)) {
    throw new Error(`patch-nitro-exception-ptr: ${file} changed upstream. Check whether this Nitro release fixes nitro#1652 and update the script (ADR 0016).`);
  }
  writeFileSync(path, source.replace(from, to));
  console.log(`patch-nitro-exception-ptr: patched ${file}`);
}
