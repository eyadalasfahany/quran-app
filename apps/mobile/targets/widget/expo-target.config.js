/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'TaybahWidgets',
  displayName: 'طيبة',
  deploymentTarget: '16.4',
  icon: '../_assets/widget-icon.png',
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
  colors: {
    $accent: { color: '#1f4d40', darkColor: '#3d8f7a' },
    $widgetBackground: { color: '#f7f3ea', darkColor: '#13231f' },
  },
});
