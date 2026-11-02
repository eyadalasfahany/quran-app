// Writes android/local.properties (sdk.dir) on every prebuild, so Gradle finds the SDK
// even when the shell that runs the build has no ANDROID_HOME. android/ is generated and
// gitignored, so a hand-written local.properties is lost on each `prebuild --clean`.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const os = require('os');
const path = require('path');

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ];
  return candidates.find((dir) => dir && fs.existsSync(dir));
}

module.exports = function withAndroidSdkLocation(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const sdk = findSdk();
      if (!sdk) return cfg; // No SDK found: leave Gradle's own error in place.
      const file = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
      // Gradle reads .properties with backslash escapes; use forward slashes.
      const line = `sdk.dir=${sdk.replace(/\\/g, '/')}`;
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      const rest = existing.split(/\r?\n/).filter((l) => l && !l.startsWith('sdk.dir='));
      fs.writeFileSync(file, [line, ...rest].join('\n') + '\n');
      return cfg;
    },
  ]);
};
