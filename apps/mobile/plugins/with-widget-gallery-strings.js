// Gallery names for the Android home-screen widgets (ADR 0035). The widget picker shows the device language:
// `values/strings.xml` holds the Arabic (the app's default), and `values-en/strings.xml` the English for an English
// device. The library writes the description as a literal string resource with no translation, so the English is written
// here by name; the label is written as `@string/widget_<name>_label` (app.config.ts) and defined in both files.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withDangerousMod, withStringsXml } = require('expo/config-plugins');

// English gallery text per widget name.
const ENGLISH = {
  NextPrayer: { description: 'The next prayer and its time', label: 'Next prayer' },
  NextPrayerWide: { description: 'The next prayer and the five times of today', label: "Today's prayer times" },
  Progress: { description: 'Progress on your daily goals', label: "Today's progress" },
  ContinueReading: { description: "Where you stopped reading, and today's wird", label: 'Continue reading' },
  Misbaha: { description: "The misbaha count and today's total", label: 'Misbaha' },
  Azkar: { description: "Today's Azkar sessions", label: 'Azkar' },
};

const escapeXml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "\\'");

/**
 * @param config Expo config.
 * @param {{ widgets: Array<{ name: string, label: string }> }} props The Arabic label for each widget (English is above).
 */
module.exports = function withWidgetGalleryStrings(config, { widgets }) {
  config = withStringsXml(config, (stringsConfig) => {
    for (const widget of widgets) {
      stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
        [{ $: { name: `widget_${widget.name.toLowerCase()}_label`, translatable: 'false' }, _: escapeXml(widget.label) }],
        stringsConfig.modResults,
      );
    }
    return stringsConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const dir = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main/res/values-en');
      fs.mkdirSync(dir, { recursive: true });
      const items = widgets.flatMap((widget) => {
        const english = ENGLISH[widget.name];
        const key = widget.name.toLowerCase();
        return [
          `  <string name="widget_${key}_label">${escapeXml(english.label)}</string>`,
          `  <string name="widget_${key}_description">${escapeXml(english.description)}</string>`,
        ];
      });
      fs.writeFileSync(
        path.join(dir, 'strings.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${items.join('\n')}\n</resources>\n`,
      );
      return modConfig;
    },
  ]);
};
