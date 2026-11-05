"""Tiny HTML tree for the frame partials (stdlib only, no bs4).

Parses a fragment into Node objects and writes it back. Text is kept as parsed, so Quran text that
arrives as raw UTF-8 leaves as the same bytes (build_reference.py checks this for every variant).
"""
from __future__ import annotations

from html import escape
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
# SVG children written as <path ...></path> in the source; keep them as elements with no children.
SVG_LEAF = {'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'stop', 'use'}


class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent', 'text')

    def __init__(self, tag, attrs=None, parent=None, text=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.children: list[Node] = []
        self.parent = parent
        self.text = text

    # style helpers -------------------------------------------------------
    def style(self) -> list[list[str]]:
        out = []
        for decl in (self.attrs.get('style') or '').split(';'):
            if ':' in decl:
                k, v = decl.split(':', 1)
                out.append([k.strip(), v.strip()])
        return out

    def set_style(self, decls):
        self.attrs['style'] = '; '.join(f'{k}: {v}' for k, v in decls) + (';' if decls else '')

    def get(self, prop):
        for k, v in self.style():
            if k == prop:
                return v
        return None

    def elements(self):
        return [c for c in self.children if c.tag not in ('#text', '#comment')]


class _Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#root')
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        c = self.cur
        while c is not self.root and c.tag != tag:
            c = c.parent
        if c is not self.root:
            self.cur = c.parent

    def handle_data(self, data):
        self.cur.children.append(Node('#text', None, self.cur, data))


def parse(html: str) -> Node:
    p = _Parser()
    p.feed(html)
    p.close()
    return p.root


def walk(n: Node):
    yield n
    for c in n.children:
        yield from walk(c)


# html.parser lowercases attribute names; SVG needs these back in camelCase.
SVG_ATTRS = {a.lower(): a for a in (
    'viewBox', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'patternUnits',
    'patternTransform', 'clipPathUnits', 'maskUnits', 'maskContentUnits', 'textLength',
    'lengthAdjust', 'startOffset', 'stdDeviation', 'markerWidth', 'markerHeight', 'refX', 'refY',
    'pathLength', 'spreadMethod', 'filterUnits', 'primitiveUnits', 'baseFrequency', 'numOctaves')}
SVG_TAGS = {t.lower(): t for t in (
    'linearGradient', 'radialGradient', 'clipPath', 'textPath', 'foreignObject', 'feGaussianBlur',
    'feOffset', 'feBlend', 'feColorMatrix', 'feMerge', 'feMergeNode', 'feFlood', 'feComposite',
    'feDropShadow', 'feTurbulence', 'feDisplacementMap')}


def serialize(n: Node) -> str:
    if n.tag == '#text':
        return escape(n.text, quote=False)
    if n.tag == '#root':
        return ''.join(serialize(c) for c in n.children)
    attrs = ''.join(
        f' {SVG_ATTRS.get(k, k)}' if v is None else f' {SVG_ATTRS.get(k, k)}="{escape(v, quote=True)}"'
        for k, v in n.attrs.items()
    )
    tag = SVG_TAGS.get(n.tag, n.tag)
    if n.tag in VOID:
        return f'<{tag}{attrs}>'
    return f'<{tag}{attrs}>' + ''.join(serialize(c) for c in n.children) + f'</{tag}>'

