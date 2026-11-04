import { renderProvider, isProviderName } from './render';
import { MisbahaWidget } from './MisbahaWidget';
import { WIDGET_PROVIDERS } from './names';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { styleOf, textsOf, walk } from './test-tree';

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

  it('uses different gold on light and dark misbaha rings (system appearance)', () => {
    const rendered = renderProvider(WIDGET_PROVIDERS.misbaha, fullSnapshot({ colorMode: 'dark' }), NOW, 'taybah');
    const ringSvg = (tree: ReturnType<typeof MisbahaWidget>) =>
      walk(tree).find(
        (node) => typeof node.props.svg === 'string' && styleOf(node).width === 76,
      )?.props.svg as string | undefined;
    const lightSvg = ringSvg(rendered.light as ReturnType<typeof MisbahaWidget>);
    const darkSvg = ringSvg(rendered.dark as ReturnType<typeof MisbahaWidget>);
    expect(lightSvg).toBeDefined();
    expect(darkSvg).toBeDefined();
    expect(lightSvg).not.toBe(darkSvg);
  });

  it('recognises only the shipped provider names', () => {
    expect(isProviderName('Misbaha')).toBe(true);
    expect(isProviderName('Settings')).toBe(false);
  });
});
