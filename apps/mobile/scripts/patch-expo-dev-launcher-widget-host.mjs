// Runs on postinstall. Stops the dev build crashing with «App react context shouldn't be created before» (2 Nov 2026).
//
// A home-screen widget update (react-native-android-widget's HeadlessJsTaskWorker) starts the app's ReactHost in the
// background. Opening the app from the dev launcher then crashed: the launcher clears an old host only when its instance
// is fully active, and does not wait for the asynchronous destroy, so DevLauncherAppLoader's
// `require(appHost.currentReactContext == null)` failed.
//
// Three patches:
// 1. DevLauncherController.ensureHostWasCleared — clear any context and wait for destroy.
// 2. DevLauncherAppLoader.createOnDelegateWillBeCreatedListener — if a widget raced and left a context after (1),
//    adopt it instead of crashing (destroy is async; cannot block in the activity ctor).
// 3. HeadlessJsTaskWorker — when expo-dev-launcher is on the classpath (debug only), never cold-start ReactHost;
//    retry the work instead. Release builds do not ship DevLauncher, so widgets still cold-start there.
//
// Fails the install if upstream source no longer matches, so an upgrade can't silently drop the fix.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const launcherDir = dirname(require.resolve('expo-dev-launcher/package.json'));
const widgetDir = dirname(require.resolve('react-native-android-widget/package.json'));

const PATCH_MARKER = 'patch-expo-dev-launcher-widget-host.mjs';

function applyPatch({ root, file, from, to, label, alsoFrom = [] }) {
  const path = join(root, file);
  let source;
  try {
    source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    throw new Error(
      `patch-expo-dev-launcher-widget-host: ${file} not found. Check whether this release still needs the widget/dev-launcher fix and update the script.`,
    );
  }

  if (source.includes(to)) {
    return;
  }

  const candidates = [from, ...alsoFrom];
  for (const candidate of candidates) {
    const count = source.split(candidate).length - 1;
    if (count === 1) {
      writeFileSync(path, source.replace(candidate, to));
      console.log(`patch-expo-dev-launcher-widget-host: patched ${file} (${label})`);
      return;
    }
  }

  throw new Error(
    `patch-expo-dev-launcher-widget-host: ${file} changed upstream (no unique match for ${label}). Check whether this release still needs the widget/dev-launcher fix and update the script.`,
  );
}

const UPSTREAM_ENSURE = `  private fun ensureHostWasCleared(host: ReactHost, activityToBeInvalidated: ReactActivity? = null) {
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

const PATCHED_ENSURE = `  // Patched by apps/mobile/scripts/${PATCH_MARKER}: a widget's background task may have
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

const UPSTREAM_LOADER = `  fun createOnDelegateWillBeCreatedListener(): (ReactActivity) -> Unit {
    return { activity ->
      onDelegateWillBeCreated(activity)

      require(appHost.currentReactContext == null) { "App react context shouldn't be created before." }
      appHost.addReactInstanceEventListener(object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          if (reactContextWasInitialized) {
            return
          }

          controller.onAppLoaded(context)
          onReactContext(context)
          appHost.removeReactInstanceEventListener(this)
          reactContextWasInitialized = true
          continuation!!.resume(true)
        }
      })

      activity.lifecycle.addObserver(object : DefaultLifecycleObserver {
        override fun onCreate(owner: LifecycleOwner) {
          super.onCreate(owner)
          activity.lifecycle.removeObserver(this)
        }
      })
    }
  }
`;

// Earlier deferred-destroy attempt (async; could miss onReactContextInitialized).
const DEFERRED_LOADER = `  fun createOnDelegateWillBeCreatedListener(): (ReactActivity) -> Unit {
    return { activity ->
      onDelegateWillBeCreated(activity)

      fun wireDevLauncherLoader() {
        appHost.addReactInstanceEventListener(object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
            if (reactContextWasInitialized) {
              return
            }

            controller.onAppLoaded(context)
            onReactContext(context)
            appHost.removeReactInstanceEventListener(this)
            reactContextWasInitialized = true
            continuation!!.resume(true)
          }
        })

        activity.lifecycle.addObserver(object : DefaultLifecycleObserver {
          override fun onCreate(owner: LifecycleOwner) {
            super.onCreate(owner)
            activity.lifecycle.removeObserver(this)
          }
        })
      }

      // Patched by apps/mobile/scripts/${PATCH_MARKER}: a widget may start the host after ensureHostWasCleared.
      // destroy() is async; defer wiring until the main looper runs the destroy callback (cannot block in the activity ctor).
      if (appHost.currentReactContext != null) {
        appHost.destroy("DevLauncher stale widget context", null) { _ ->
          android.os.Handler(android.os.Looper.getMainLooper()).post { wireDevLauncherLoader() }
        }
      } else {
        wireDevLauncherLoader()
      }
    }
  }
`;

const PATCHED_LOADER = `  fun createOnDelegateWillBeCreatedListener(): (ReactActivity) -> Unit {
    return { activity ->
      onDelegateWillBeCreated(activity)

      // Patched by apps/mobile/scripts/${PATCH_MARKER}: a widget may leave a context after ensureHostWasCleared.
      // Cannot block the activity ctor waiting for destroy — adopt the existing context (bundle loader already
      // points at Metro) instead of crashing on require(null).
      val existingContext = appHost.currentReactContext
      if (existingContext != null) {
        if (!reactContextWasInitialized) {
          controller.onAppLoaded(existingContext)
          onReactContext(existingContext)
          reactContextWasInitialized = true
          continuation?.resume(true)
        }
      } else {
        appHost.addReactInstanceEventListener(object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
            if (reactContextWasInitialized) {
              return
            }

            controller.onAppLoaded(context)
            onReactContext(context)
            appHost.removeReactInstanceEventListener(this)
            reactContextWasInitialized = true
            continuation!!.resume(true)
          }
        })
      }

      activity.lifecycle.addObserver(object : DefaultLifecycleObserver {
        override fun onCreate(owner: LifecycleOwner) {
          super.onCreate(owner)
          activity.lifecycle.removeObserver(this)
        }
      })
    }
  }
`;

const UPSTREAM_HEADLESS = `    protected void startTask(final HeadlessJsTaskConfig taskConfig) {
        ReactHost reactHost = this.getReactHost();
        ReactContext reactContext = reactHost.getCurrentReactContext();

        if (reactContext == null) {
            reactHost.addReactInstanceEventListener(new ReactInstanceEventListener() {
                public void onReactContextInitialized(ReactContext reactContext) {
                    HeadlessJsTaskWorker.this.invokeStartTask(reactContext, taskConfig);
                    reactHost.removeReactInstanceEventListener(this);
                }
            });
            reactHost.start();
        } else {
            this.invokeStartTask(reactContext, taskConfig);
        }
    }
`;

const PATCHED_HEADLESS = `    protected void startTask(final HeadlessJsTaskConfig taskConfig) {
        ReactHost reactHost = this.getReactHost();
        ReactContext reactContext = reactHost.getCurrentReactContext();

        if (reactContext == null) {
            // Patched by apps/mobile/scripts/${PATCH_MARKER}: expo-dev-launcher (debug only) crashes if a widget
            // cold-starts ReactHost before MainActivity. Retry until the app (or a prior start) owns the host.
            // Release APKs omit DevLauncher, so Class.forName fails and cold-start still runs there.
            try {
                Class.forName("expo.modules.devlauncher.DevLauncherController");
                if (mCompleter != null) {
                    mCompleter.set(Result.retry());
                }
                return;
            } catch (ClassNotFoundException ignored) {
                // release / no DevLauncher
            }
            reactHost.addReactInstanceEventListener(new ReactInstanceEventListener() {
                public void onReactContextInitialized(ReactContext reactContext) {
                    HeadlessJsTaskWorker.this.invokeStartTask(reactContext, taskConfig);
                    reactHost.removeReactInstanceEventListener(this);
                }
            });
            reactHost.start();
        } else {
            this.invokeStartTask(reactContext, taskConfig);
        }
    }
`;

applyPatch({
  root: launcherDir,
  file: 'android/src/debug/java/expo/modules/devlauncher/DevLauncherController.kt',
  label: 'ensureHostWasCleared',
  from: UPSTREAM_ENSURE,
  to: PATCHED_ENSURE,
});

applyPatch({
  root: launcherDir,
  file: 'android/src/debug/java/expo/modules/devlauncher/launcher/loaders/DevLauncherAppLoader.kt',
  label: 'createOnDelegateWillBeCreatedListener',
  from: UPSTREAM_LOADER,
  alsoFrom: [DEFERRED_LOADER],
  to: PATCHED_LOADER,
});

applyPatch({
  root: widgetDir,
  file: 'android/src/main/java/com/reactnativeandroidwidget/oss/HeadlessJsTaskWorker.java',
  label: 'startTask-no-cold-start-with-dev-launcher',
  from: UPSTREAM_HEADLESS,
  to: PATCHED_HEADLESS,
});
