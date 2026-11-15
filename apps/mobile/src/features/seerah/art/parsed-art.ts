import { parse, type JsxAST } from 'react-native-svg';

const cache = new Map<string, JsxAST | null>();

/**
 * The art's SVG parsed once per session (a level's art is about 135 KB; parsing it took about 35 ms on every map mount and
 * again for every crisp redraw). Keyed by the source, so each level and theme is parsed the first time it is drawn.
 */
export function parsedArt(xml: string): JsxAST | null {
  let ast = cache.get(xml);
  if (ast === undefined) {
    ast = parse(xml);
    cache.set(xml, ast);
  }
  return ast;
}
