import { isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Test helpers for the widget layouts. A layout returns library elements (not rendered views), so a test walks the
 * element tree and reads the props the library would turn into RemoteViews.
 */

type AnyElement = ReactElement<Record<string, unknown>>;

/** Every element in the tree, depth first, root included. */
export function walk(node: ReactNode): AnyElement[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => walk(child));
  }
  if (!isValidElement(node)) {
    return [];
  }
  const element = node as AnyElement;
  const children = element.props.children as ReactNode;
  return [element, ...walk(children)];
}

/** The text of every text element, in document order. */
export function textsOf(node: ReactNode): string[] {
  return walk(node)
    .filter((element) => typeof element.props.text === 'string')
    .map((element) => element.props.text as string);
}

/** Elements whose `type` is the given library component (matched by its `__name__`). */
export function ofKind(node: ReactNode, name: string): AnyElement[] {
  return walk(node).filter((element) => (element.type as { __name__?: string }).__name__ === name);
}

/** The style object of an element. */
export function styleOf(element: AnyElement): Record<string, unknown> {
  return (element.props.style ?? {}) as Record<string, unknown>;
}

/** Card fill token: solid `backgroundColor` or gradient `from`. */
export function cardFill(style: Record<string, unknown>): string | undefined {
  const gradient = style.backgroundGradient as { from?: string } | undefined;
  if (gradient?.from) {
    return gradient.from;
  }
  return style.backgroundColor as string | undefined;
}

/** Fill colour of a widget card root (solid or the first nested gradient layer after OverlapWidget). */
export function cardRootFill(tree: ReactNode): string | undefined {
  const nodes = walk(tree);
  for (const node of nodes) {
    const fill = cardFill(styleOf(node));
    if (fill !== undefined) {
      return fill;
    }
  }
  return undefined;
}

/** The content layer that carries OPEN_URI / OPEN_APP (nested under OverlapWidget for gradient cards). */
export function cardClickProps(tree: ReactNode): Record<string, unknown> | undefined {
  const hit = walk(tree).find(
    (node) => typeof node.props.clickAction === 'string' && node.props.clickAction !== undefined,
  );
  return hit?.props;
}

const ARABIC_INDIC = /[\u0660-\u0669\u066a\u066b]/;

/** True when at least one text node uses Arabic-Indic digits or the Arabic percent sign. */
export function hasArabicIndicNumerals(node: ReactNode): boolean {
  return textsOf(node).some((text) => ARABIC_INDIC.test(text));
}

/** Every full-width label's `textAlign` in the tree (labels that fill the column width). */
export function fullWidthLabelAligns(node: ReactNode): ('left' | 'right' | 'center')[] {
  return walk(node)
    .filter((element) => typeof element.props.text === 'string' && styleOf(element).width === 'match_parent')
    .map((element) => styleOf(element).textAlign as 'left' | 'right' | 'center');
}

/** Full-width labels that follow reading direction (not explicitly centred). */
export function startAlignedFullWidthLabels(node: ReactNode, rtl: boolean): boolean {
  const expected = rtl ? 'right' : 'left';
  return walk(node)
    .filter((element) => typeof element.props.text === 'string' && styleOf(element).width === 'match_parent')
    .filter((element) => styleOf(element).textAlign !== 'center')
    .every((element) => styleOf(element).textAlign === expected);
}
