import { IDENTITY, multiply, parseSvgPage, parseTransform, SvgPageParseError } from './svg-page-model';

// Synthetic markup only: placeholder paths, never artwork.
const ROOT = 'matrix(1 0 0 -1 -10 500)';

function page(body: string, root = ROOT, viewBox = '0 0 345 550'): string {
  return `<svg viewBox="${viewBox}"><g transform="${root}">${body}</g><path class="ayahPolygon" d="M 0 0 L 1 1 Z"/></svg>`;
}

describe('multiply and parseTransform', () => {
  it('keeps the identity neutral and multiplies in SVG order', () => {
    const p = [2, 0, 0, 3, 5, 7] as const;
    const q = [1, 0.5, -0.5, 1, 2, -3] as const;
    expect(multiply(IDENTITY, p)).toEqual(p);
    expect(multiply(p, IDENTITY)).toEqual(p);
    expect(multiply(multiply(p, q), [1, 0, 0, 1, 4, 4])).toEqual(multiply(p, multiply(q, [1, 0, 0, 1, 4, 4])));
  });

  it('parses translate with a space and with a comma, and the one-argument forms', () => {
    expect(parseTransform('translate(3 4)')).toEqual([1, 0, 0, 1, 3, 4]);
    expect(parseTransform('translate(3,4)')).toEqual([1, 0, 0, 1, 3, 4]);
    expect(parseTransform('translate(3)')).toEqual([1, 0, 0, 1, 3, 0]);
    expect(parseTransform('scale(2)')).toEqual([2, 0, 0, 2, 0, 0]);
    expect(parseTransform('scale(2 -1)')).toEqual([2, 0, 0, -1, 0, 0]);
  });

  it('composes the three-function ornament chain left to right', () => {
    // translate(1 2) · scale(2) · matrix(1 0 0 1 3 0): the last function is applied to a point first.
    const expected = multiply(multiply([1, 0, 0, 1, 1, 2], [2, 0, 0, 2, 0, 0]), [1, 0, 0, 1, 3, 0]);
    expect(parseTransform('translate(1 2) scale(2) matrix(1 0 0 1 3 0)')).toEqual(expected);
    // By hand: T(1,2) · S(2) = [2 0 0 2 1 2]; then · T(3,0) gives e = 2·3 + 1 = 7 and f = 2.
    expect(expected).toEqual([2, 0, 0, 2, 7, 2]);
  });

  it('reads signed, decimal and exponent numbers', () => {
    expect(parseTransform('matrix(1.5 0 0 1e-1 .5 -2.25e1)')).toEqual([1.5, 0, 0, 0.1, 0.5, -22.5]);
  });

  it('returns null for rotate, skew, a non-numeric value, an empty value and a bad arity', () => {
    expect(parseTransform('rotate(45)')).toBeNull();
    expect(parseTransform('skewX(10)')).toBeNull();
    expect(parseTransform('translate(a b)')).toBeNull();
    expect(parseTransform('')).toBeNull();
    expect(parseTransform('matrix(1 0 0 1 0)')).toBeNull();
    expect(parseTransform('translate(1 2) junk')).toBeNull();
  });
});

describe('parseSvgPage', () => {
  it('applies the root matrix to a path directly in content', () => {
    const model = parseSvgPage(page('<g id="content"><g transform="translate(2 3)"><path d="M 0 0 L 1 0 L 1 1 Z"/></g></g>'));
    expect(model.viewBox).toEqual({ height: 550, width: 345 });
    expect(model.pieces).toEqual([{ d: 'M 0 0 L 1 0 L 1 1 Z', matrix: multiply([1, 0, 0, -1, -10, 500], [1, 0, 0, 1, 2, 3]) }]);
  });

  it('accepts a comma separator and keeps nested groups in the chain', () => {
    const body =
      '<g id="content"><g transform="translate(1,1)"><g transform="scale(2)"><path d="M 0 0 Z"/></g></g></g>';
    const [piece] = parseSvgPage(page(body)).pieces;
    expect(piece!.matrix).toEqual(multiply([1, 0, 0, -1, -10, 500], multiply([1, 0, 0, 1, 1, 1], [2, 0, 0, 2, 0, 0])));
  });

  it('lists ayah markers before content, and keeps document order inside each', () => {
    const body =
      '<g id="content"><g transform="translate(5 5)"><path d="C-1"/><path d="C-2"/></g></g>' +
      '<g id="ayah_markers"><g class="ayah-mark"><g transform="translate(9 9)"><path d="M-1"/></g></g>' +
      '<g class="ayah-mark"><path d="M-2"/></g></g>';
    expect(parseSvgPage(page(body)).pieces.map((piece) => piece.d)).toEqual(['M-1', 'M-2', 'C-1', 'C-2']);
  });

  it('composes the ornament chain of an ayah marker with the root', () => {
    const body =
      '<g id="ayah_markers"><g class="ayah-mark"><g class="ayah-mark-ornament" transform="translate(1 2) scale(3 4) matrix(1 0 0 1 5 6)">' +
      '<path d="O"/></g></g></g>';
    const [piece] = parseSvgPage(page(body)).pieces;
    const chain = parseTransform('translate(1 2) scale(3 4) matrix(1 0 0 1 5 6)')!;
    expect(piece!.matrix).toEqual(multiply([1, 0, 0, -1, -10, 500], chain));
  });

  it('skips the ayahPolygon paths, paths outside the root group, paths without d, and a marker path outside .ayah-mark', () => {
    const body =
      '<g id="content"><g transform="translate(0 0)"><path/></g><path d="IN-CONTENT"/></g>' +
      '<g id="ayah_markers"><path d="NOT-IN-MARK"/></g>';
    const model = parseSvgPage(
      `<svg viewBox="0 0 345 550"><path d="OUTSIDE"/><g transform="${ROOT}">${body}</g>` +
        '<path class="ayahPolygon" fill-opacity="0" d="POLY"/></svg>',
    );
    expect(model.pieces.map((piece) => piece.d)).toEqual(['IN-CONTENT']);
  });

  it('returns each path d byte for byte, odd spacing included', () => {
    const odd = 'M  0,0\n\tL 1.50   2 , 3 Z';
    const [piece] = parseSvgPage(page(`<g id="content"><g transform="translate(0 0)"><path d="${odd}"/></g></g>`)).pieces;
    expect(piece!.d).toBe(odd);
  });

  it('throws for a rotate transform inside the page, a bad number, a wrong viewBox, and a missing root group', () => {
    const rotated = '<g id="content"><g transform="rotate(10)"><path d="M 0 0"/></g></g>';
    expect(() => parseSvgPage(page(rotated))).toThrow(SvgPageParseError);
    const nonNumeric = '<g id="content"><g transform="translate(x 0)"><path d="M 0 0"/></g></g>';
    expect(() => parseSvgPage(page(nonNumeric))).toThrow(SvgPageParseError);
    expect(() => parseSvgPage(page('<g id="content"><path d="M 0 0"/></g>', ROOT, '0 0 300 550'))).toThrow(SvgPageParseError);
    expect(() => parseSvgPage('<svg viewBox="0 0 345 550"><g id="content"><path d="M 0 0"/></g></svg>')).toThrow(
      SvgPageParseError,
    );
  });

  it('throws when a page has no paths in its sections', () => {
    expect(() => parseSvgPage(page('<g id="content"></g>'))).toThrow(SvgPageParseError);
  });

  it('accepts a shifted viewBox origin, reports it, and bakes it into every matrix', () => {
    const body = '<g id="content"><g transform="translate(2 3)"><path d="M 0 0 Z"/></g></g>';
    const model = parseSvgPage(page(body, ROOT, '-10 -20 345 550'));
    expect(model.origin).toEqual({ x: -10, y: -20 });
    const expected = multiply([1, 0, 0, 1, 10, 20], multiply([1, 0, 0, -1, -10, 500], [1, 0, 0, 1, 2, 3]));
    expect(model.pieces).toEqual([{ d: 'M 0 0 Z', matrix: expected }]);
  });

  it('keeps a zero origin with unchanged matrices for a 0 0 viewBox', () => {
    const body = '<g id="content"><g transform="translate(2 3)"><path d="M 0 0 Z"/></g></g>';
    const model = parseSvgPage(page(body));
    expect(model.origin).toEqual({ x: 0, y: 0 });
    expect(model.pieces[0]!.matrix).toEqual(multiply([1, 0, 0, -1, -10, 500], [1, 0, 0, 1, 2, 3]));
  });

  it('throws for a shifted viewBox of the wrong size or with a non-finite origin', () => {
    const body = '<g id="content"><path d="M 0 0"/></g>';
    expect(() => parseSvgPage(page(body, ROOT, '-10 -20 300 550'))).toThrow(SvgPageParseError);
    expect(() => parseSvgPage(page(body, ROOT, '-10 -20 345 500'))).toThrow(SvgPageParseError);
    expect(() => parseSvgPage(page(body, ROOT, 'x -20 345 550'))).toThrow(SvgPageParseError);
  });
});
