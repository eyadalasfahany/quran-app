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
