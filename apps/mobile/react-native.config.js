/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependencies: {
    // iOS-only (watch bridge, ADR 0035 step 7). The Android stub does not compile on RN 0.88 yet.
    'react-native-watch-connectivity': {
      platforms: {
        android: null,
      },
    },
  },
};
