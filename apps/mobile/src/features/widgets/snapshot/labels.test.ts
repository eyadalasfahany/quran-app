import { buildWidgetLabels } from './labels';
import { WIDGET_LABEL_KEYS } from './types';
import { i18n } from '@/core/i18n/i18n';

describe('buildWidgetLabels', () => {
  it('fills every label key from the widgets group, in Arabic', () => {
    const labels = buildWidgetLabels(i18n.getFixedT('ar'));
    expect(Object.keys(labels).sort()).toEqual([...WIDGET_LABEL_KEYS].sort());
    for (const key of WIDGET_LABEL_KEYS) {
      expect(labels[key].length).toBeGreaterThan(0);
    }
    expect(labels.nextPrayer).toBe('الصلاة القادمة');
  });

  it('translates to English when asked', () => {
    expect(buildWidgetLabels(i18n.getFixedT('en')).nextPrayer).toBe('Next prayer');
  });
});
