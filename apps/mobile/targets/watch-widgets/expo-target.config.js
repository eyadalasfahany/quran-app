/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch-widget',
  name: 'TaybahWatchWidgets',
  displayName: 'طيبة',
  deploymentTarget: '10.0',
  bundleIdentifier: '.watchwidgets',
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
});
