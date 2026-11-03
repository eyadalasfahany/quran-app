// iOS purpose strings (ADR 0058). Arabic is the app's default; the English strings live in app.config.ts `locales`.
// Location is foreground-only (ADR 0030), so the Always keys carry the same text as When-In-Use.
const { withInfoPlist } = require('expo/config-plugins');

const LOCATION = 'يحتاج طيبة إلى موقعك لعرض مواقيت الصلاة واتجاه القبلة.';
const MOTION = 'يستخدم طيبة مستشعرات الجهاز لتحديد اتجاه القبلة.';

/**
 * @param config Expo config.
 * @param {{ production: boolean }} props `production` drops the dev launcher's local-network text from release builds.
 */
module.exports = (config, { production }) =>
  withInfoPlist(config, (config) => {
    const plist = config.modResults;
    plist.NSLocationAlwaysAndWhenInUseUsageDescription = LOCATION;
    plist.NSLocationAlwaysUsageDescription = LOCATION;
    plist.NSLocationWhenInUseUsageDescription = LOCATION;
    plist.NSMotionUsageDescription = MOTION;
    plist.NSLocationTemporaryUsageDescriptionDictionary = { ExpoLocationFullAccuracy: LOCATION };
    if (production) {
      delete plist.NSLocalNetworkUsageDescription;
    }
    return config;
  });
