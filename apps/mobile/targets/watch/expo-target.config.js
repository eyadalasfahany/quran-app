/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',
  name: 'TaybahWatch',
  displayName: 'طيبة',
  // OPEN: ADR 0035 decision 3 — watchOS 10 minimum (developer accepted 2 Nov 2026).
  deploymentTarget: '10.0',
  icon: '../_assets/watch-icon.png',
  bundleIdentifier: '.watchkitapp',
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
});
