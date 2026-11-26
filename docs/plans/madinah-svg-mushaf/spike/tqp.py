"""Reference codec (TQP1, ADR 0090 amendment 24 Nov 2026): SVG page -> baked, grid-quantized binary.

Container = 18-byte header || BODY. The blob on disk = header || raw-deflate(BODY), level 9
(LZMA was dropped 26 Nov 2026: about 11x slower than fflate on Hermes).
Canonical scope is the app's parseSvgPage (apps/mobile/.../svg-page-model.ts); see page_pieces().

Usage:
  tqp.py measure N page.svg...          sizes per page (gzip SVG vs TQP1 blob) + round-trip check
  tqp.py svg N in.svg out.svg            decoded page written back as SVG (for render checks)
  tqp.py body N in.svg out.bin           uncompressed container (header || body): golden for PHP/TS tests
  tqp.py ints N in.svg out.json          decoded integers: [[code, [[x, y], ...]], ...] (absolute grid units)
N = grid steps per viewBox unit (32 for TQP1, ADR 0090 amendment of 26 Nov 2026).
"""
import gzip, math, re, struct, sys, zlib
import xml.etree.ElementTree as ET

NS = '{http://www.w3.org/2000/svg}'
NUM = r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'
TOK = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])|(' + NUM + ')')
ARGS = dict(m=2, l=2, h=1, v=1, c=6, s=4, q=4, t=2, a=7, z=0)
M, L, Q, C, Z = range(5)
NPTS = {M: 1, L: 1, Q: 2, C: 3, Z: 0}
def deflate(data):
    """Raw deflate, level 9: PHP gzdeflate($body, 9); the app reads it with fflate inflateSync."""
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return c.compress(data) + c.flush()


def inflate(data):
    return zlib.decompress(data, -15)


def mul(p, q):
    a, b, c, d, e, f = p
    A, B, C_, D, E, F = q
    return (a * A + c * B, b * A + d * B, a * C_ + c * D, b * C_ + d * D, a * E + c * F + e, b * E + d * F + f)


def parse_transform(v):
    m = (1, 0, 0, 1, 0, 0)
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', v or ''):
        n = [float(x) for x in re.findall(NUM, args)]
        if name == 'matrix':
            t = tuple(n)
        elif name == 'translate':
            t = (1, 0, 0, 1, n[0], n[1] if len(n) > 1 else 0)
        elif name == 'scale':
            t = (n[0], 0, 0, n[1] if len(n) > 1 else n[0], 0, 0)
        else:
            raise ValueError('unsupported transform ' + name)
        m = mul(m, t)
    return m


def abs_segments(d):
    """SVG path data -> [(code, [(x, y), ...])] absolute, with H/V/S/T expanded."""
    it = [c or float(n) for c, n in TOK.findall(d)]
    i = 0; cmd = None; cx = cy = sx = sy = 0.0; pc = pq = None; out = []
    while i < len(it):
        if isinstance(it[i], str):
            cmd = it[i]; i += 1
        lc = cmd.lower(); rel = cmd.islower(); k = ARGS[lc]
        if lc == 'a':
            raise ValueError('arc not supported')
        a = it[i:i + k]; i += k
        bx, by = (cx, cy) if rel else (0.0, 0.0)
        P = lambda j: (bx + a[j], by + a[j + 1])
        if lc == 'z':
            out.append((Z, [])); cx, cy = sx, sy; pc = pq = None; continue
        if lc == 'm':
            p = P(0); out.append((M, [p])); cx, cy = sx, sy = p; pc = pq = None
            cmd = 'l' if rel else 'L'; continue
        if lc in 'lhv':
            p = (bx + a[0], cy) if lc == 'h' else (cx, by + a[0]) if lc == 'v' else P(0)
            out.append((L, [p])); pc = pq = None
        elif lc in 'cs':
            if lc == 'c':
                c1, c2, p = P(0), P(2), P(4)
            else:
                c1 = (2 * cx - pc[0], 2 * cy - pc[1]) if pc else (cx, cy); c2, p = P(0), P(2)
            out.append((C, [c1, c2, p])); pc = c2; pq = None
        else:
            if lc == 'q':
                c1, p = P(0), P(2)
            else:
                c1 = (2 * cx - pq[0], 2 * cy - pq[1]) if pq else (cx, cy); p = P(0)
            out.append((Q, [c1, p])); pq = c1; pc = None
        cx, cy = p
    return out


def page_pieces(svg_bytes):
    """[(d, matrix)] for the drawn pieces, the app's parseSvgPage scope (Part 0.1), zero origin.

    Rules (same as the app): the page root is the first <g transform> whose subtree holds #ayah_markers
    or #content; only that group is walked. Only <g> carries a transform. A path is drawn under #content,
    or under #ayah_markers inside an ancestor <g class="ayah-mark"> (an own class on the path does not count).
    Document order.
    """
    root = ET.fromstring(svg_bytes)
    vb = [float(x) for x in root.get('viewBox').split()]
    shift = (1, 0, 0, 1, -vb[0], -vb[1])
    rootg = None
    for g in root.iter(NS + 'g'):
        if g.get('transform') is not None and any(e.get('id') in ('ayah_markers', 'content') for e in g.iter()):
            rootg = g
            break
    if rootg is None:
        raise ValueError('no root group with ayah_markers or content')
    out = []

    def walk(e, m, section, mark):
        if e.tag == NS + 'g':
            m = mul(m, parse_transform(e.get('transform')))
            if e.get('id') == 'ayah_markers':
                section = 'markers'
            elif e.get('id') == 'content':
                section = 'content'
            mark = mark or 'ayah-mark' in (e.get('class') or '').split()
        if e.tag == NS + 'path' and e.get('d') is not None and (section == 'content' or (section == 'markers' and mark)):
            out.append((e.get('d'), m))
        for k in e:
            walk(k, m, section, mark)

    walk(rootg, shift, None, False)
    return out


def q(v, n):
    """Quantise one coordinate to the 1/n grid. floor(v*n + 0.5): half rounds toward +infinity."""
    return math.floor(v * n + 0.5)


def quantized(svg_bytes, n):
    """All pieces baked into viewBox coords and snapped to the 1/n grid: [(code, [(X, Y) ints])]."""
    segs = []
    for d, (a, b, c, dd, e, f) in page_pieces(svg_bytes):
        for code, pts in abs_segments(d):
            segs.append((code, [(q(a * x + c * y + e, n), q(b * x + dd * y + f, n)) for x, y in pts]))
    return segs


def zz(v):
    u = 2 * v if v >= 0 else -2 * v - 1
    assert u < 2 ** 32, 'delta needs more than 32 bits'
    return u


def unzz(u):
    return -((u + 1) >> 1) if u & 1 else u >> 1


def container(segs, n):
    """header || body (uncompressed). Body = cmds | lo | hi | esc (uint32 LE)."""
    cmds = bytearray(); lo = bytearray(); hi = bytearray(); esc = []
    cx = cy = sx = sy = 0
    for code, pts in segs:
        cmds.append(code)
        for x, y in pts:
            for v in (x - cx, y - cy):
                u = zz(v)
                if u >= 0xFFFF:
                    lo.append(0xFF); hi.append(0xFF); esc.append(u)
                else:
                    lo.append(u & 0xFF); hi.append(u >> 8)
        if code == Z:
            cx, cy = sx, sy
        else:
            cx, cy = pts[-1]
            if code == M:
                sx, sy = cx, cy
    body = bytes(cmds) + bytes(lo) + bytes(hi) + struct.pack('<%dI' % len(esc), *esc)
    return b'TQP1' + struct.pack('<HIII', n, len(cmds), len(lo), len(esc)) + body


def parse_container(cont):
    """Uncompressed container -> (n, segs). Checks the header against the body length."""
    assert cont[:4] == b'TQP1'
    n, nc, nv, ne = struct.unpack('<HIII', cont[4:18])
    body = cont[18:]
    assert nc + 2 * nv + 4 * ne == len(body), 'body length mismatch'
    cmds = body[:nc]; lo = body[nc:nc + nv]; hi = body[nc + nv:nc + 2 * nv]
    esc = struct.unpack('<%dI' % ne, body[nc + 2 * nv:])
    vi = ei = 0; cx = cy = sx = sy = 0; segs = []

    def nxt():
        nonlocal vi, ei
        u = lo[vi] | hi[vi] << 8; vi += 1
        if u == 0xFFFF:
            u = esc[ei]; ei += 1
        return unzz(u)

    for code in cmds:
        pts = []
        for _ in range(NPTS[code]):
            dx = nxt(); dy = nxt(); pts.append((cx + dx, cy + dy))
        segs.append((code, pts))
        if code == Z:
            cx, cy = sx, sy
        else:
            cx, cy = pts[-1]
            if code == M:
                sx, sy = cx, cy
    assert vi == nv and ei == ne
    return n, segs


def decode(blob):
    """Blob on disk (header || raw-deflate body) -> (n, segs)."""
    assert blob[:4] == b'TQP1'
    return parse_container(blob[:18] + inflate(blob[18:]))


def to_svg_d(segs, n):
    f = lambda v: ('%.6f' % (v / n)).rstrip('0').rstrip('.')
    letters = 'MLQCZ'
    return ''.join(letters[c] + ' '.join(f'{f(x)} {f(y)}' for x, y in pts) for c, pts in segs)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    mode, n = sys.argv[1], int(sys.argv[2])
    if mode == 'svg':
        src, dst = sys.argv[3], sys.argv[4]
        raw = open(src, 'rb').read()
        vb = ET.fromstring(raw).get('viewBox').split()
        _, segs = parse_container(container(quantized(raw, n), n))
        open(dst, 'w').write(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb[2]} {vb[3]}">'
            f'<path fill="#231f20" fill-rule="evenodd" d="{to_svg_d(segs, n)}"/></svg>')
        return
    if mode in ('body', 'ints'):
        src, dst = sys.argv[3], sys.argv[4]
        raw = open(src, 'rb').read()
        cont = container(quantized(raw, n), n)
        if mode == 'body':
            open(dst, 'wb').write(cont)
        else:
            _, segs = parse_container(cont)
            open(dst, 'w').write('[' + ','.join(
                '[%d,[%s]]' % (code, ','.join('[%d,%d]' % p for p in pts)) for code, pts in segs) + ']')
        return
    if mode != 'measure':
        sys.exit(__doc__)
    tot_o = tot_n = 0
    for f in sys.argv[3:]:
        raw = open(f, 'rb').read()
        segs = quantized(raw, n)
        cont = container(segs, n)
        blob = cont[:18] + deflate(cont[18:])
        n2, back = decode(blob)
        assert n2 == n and back == segs, 'round trip failed: ' + f
        o = len(gzip.compress(raw, 9)); tot_o += o; tot_n += len(blob)
    print(f'N={n} pages={len(sys.argv) - 3} gzip-svg={tot_o / 1e6:.2f}MB tqp1={tot_n / 1e6:.2f}MB '
          f'ratio={tot_n / tot_o:.3f} round-trip OK')


if __name__ == '__main__':
    main()
