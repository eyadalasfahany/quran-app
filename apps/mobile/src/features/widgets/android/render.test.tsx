import { renderProvider, isProviderName } from './render';
import { WIDGET_PROVIDERS } from './names';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { textsOf } from './test-tree';

const NOW = new Date(2026, 10, 2, 12, 0);

describe('renderProvider', () => {
  it('draws the light and the dark look of every provider', () => {
    for (const name of Object.values(WIDGET_PROVIDERS)) {
      const rendered = renderProvider(name, fullSnapshot(), NOW, 'taybah');
      expect(rendered.light).toBeTruthy();
      expect(rendered.dark).toBeTruthy();
    }
  });

  it('draws the open-the-app card for every provider when there is no snapshot', () => {
    const rendered = renderProvider(WIDGET_PROVIDERS.progress, null, NOW, 'taybah');
    expect(textsOf(rendered.light)).toHaveLength(1);
    expect(textsOf(rendered.dark)).toHaveLength(1);
  });

  it('uses the same palette for light and dark trees from snapshot colorMode (ADR 0054)', () => {
    const rendered = renderProvider(WIDGET_PROVIDERS.misbaha, fullSnapshot({ colorMode: 'dark' }), NOW, 'taybah');
    const lightBg = (rendered.light as { props: { style: { backgroundColor: string } } }).props.style.backgroundColor;
    const darkBg = (rendered.dark as { props: { style: { backgroundColor: string } } }).props.style.backgroundColor;
    expect(lightBg).toBe(darkBg);
  });

  it('recognises only the shipped provider names', () => {
    expect(isProviderName('Misbaha')).toBe(true);
    expect(isProviderName('Settings')).toBe(false);
  });
});
