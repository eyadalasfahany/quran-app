import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

describe('patch-expo-dev-launcher-widget-host', () => {
  it('clears stale widget React context in DevLauncherAppLoader instead of require()', () => {
    const launcherDir = dirname(require.resolve('expo-dev-launcher/package.json'));
    const appLoaderPath = join(
      launcherDir,
      'android/src/debug/java/expo/modules/devlauncher/launcher/loaders/DevLauncherAppLoader.kt',
    );
    const source = readFileSync(appLoaderPath, 'utf8');

    expect(source).toContain('wireDevLauncherLoader');
    expect(source).toContain('DevLauncher stale widget context');
    expect(source).not.toMatch(/require\(appHost\.currentReactContext == null\)/);
  });

  it('waits for host destroy in DevLauncherController.ensureHostWasCleared', () => {
    const launcherDir = dirname(require.resolve('expo-dev-launcher/package.json'));
    const controllerPath = join(
      launcherDir,
      'android/src/debug/java/expo/modules/devlauncher/DevLauncherController.kt',
    );
    const source = readFileSync(controllerPath, 'utf8');

    expect(source).toContain('CountDownLatch');
    expect(source).not.toContain('hasActiveReactInstance() == true');
  });
});
