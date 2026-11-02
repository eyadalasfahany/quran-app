// Runs on postinstall. Stops the dev build crashing with «App react context shouldn't be created before» (2 Nov 2026).
//
// A home-screen widget update (react-native-android-widget's HeadlessJsTaskWorker) starts the app's ReactHost in the
// background. Opening the app from the dev launcher then crashed: the launcher clears an old host only when its instance
// is fully active, and does not wait for the asynchronous destroy, so DevLauncherAppLoader's
// `require(appHost.currentReactContext == null)` failed. This patch clears any existing context and, off the main
// thread, waits (up to 5 s) for the destroy to finish. expo-dev-launcher's controller is in src/debug: release builds
// do not include it, so production is unaffected.
//
// Fails the install if expo-dev-launcher's source no longer matches, so an upgrade can't silently drop the fix.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const launcherDir = dirname(require.resolve('expo-dev-launcher/package.json'));

const file = 'android/src/debug/java/expo/modules/devlauncher/DevLauncherController.kt';
const from = `  private fun ensureHostWasCleared(host: ReactHost, activityToBeInvalidated: ReactActivity? = null) {
    if (host.currentReactContext?.hasActiveReactInstance() == true) {
      runBlockingOnMainThread {
        networkInterceptor?.close()
        networkInterceptor = null
        clearHost(host, activityToBeInvalidated)
      }
    }
  }

  @UiThread
  private fun clearHost(host: ReactHost, activityToBeInvalidated: ReactActivity?) {
    host.destroy("DevLauncher reloading app", null)
    activityToBeInvalidated?.let {
      invalidateActivity(it)
    }
  }
`;
const to = `  // Patched by apps/mobile/scripts/patch-expo-dev-launcher-widget-host.mjs: a widget's background task may have
  // started the host, so clear any context (not only an active one) and wait for the destroy to finish.
  private fun ensureHostWasCleared(host: ReactHost, activityToBeInvalidated: ReactActivity? = null) {
    if (host.currentReactContext != null) {
      val destroyed = java.util.concurrent.CountDownLatch(1)
      runBlockingOnMainThread {
        networkInterceptor?.close()
        networkInterceptor = null
        clearHost(host, activityToBeInvalidated) { destroyed.countDown() }
      }
      if (android.os.Looper.myLooper() != android.os.Looper.getMainLooper()) {
        destroyed.await(5, java.util.concurrent.TimeUnit.SECONDS)
      }
    }
  }

  @UiThread
  private fun clearHost(host: ReactHost, activityToBeInvalidated: ReactActivity?, onDestroyed: () -> Unit = {}) {
    host.destroy("DevLauncher reloading app", null) { _ -> onDestroyed() }
    activityToBeInvalidated?.let {
      invalidateActivity(it)
    }
  }
`;

const path = join(launcherDir, file);
let source;
try {
  source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
} catch {
  throw new Error(`patch-expo-dev-launcher-widget-host: ${file} not found. Check whether this expo-dev-launcher release still crashes after a widget update and update the script.`);
}

if (!source.includes(to)) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`patch-expo-dev-launcher-widget-host: ${file} changed upstream (${count} matches). Check whether this expo-dev-launcher release still crashes after a widget update and update the script.`);
  }
  writeFileSync(path, source.replace(from, to));
  console.log(`patch-expo-dev-launcher-widget-host: patched ${file}`);
}
