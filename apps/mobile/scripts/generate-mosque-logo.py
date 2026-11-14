#!/usr/bin/env python3
"""The Taybah line-art mosque logo (ADR 0088): one source for the logo SVGs and the splash draw.

Writes:
  docs/branding/taybah-mosque-lineart.svg   the mosque alone, as brush strokes (filled shapes)
  docs/branding/taybah-mosque-logo.svg      the full 1254 x 1254 logo on cream: the mosque, then the
                                            «طيبة» and "taybah" lettering traced from the original logo
                                            (docs/branding/taybah-wordmark-ar.svg, -latin.svg)
  apps/mobile/src/shared/ui/splash-mosque-strokes.ts
                                            the mosque's centrelines on the same 1254 canvas, with their
                                            lengths and draw windows, for the animated splash

Every line of the mosque is a hand-placed centreline. The brush version gives each line a width that
lands thick and tapers (curves) or swells in the middle (straight lines); the splash draws the
centrelines as pen strokes, then fades the brush version in on top.

Then render the PNG source and regenerate the assets (from the repo root):
  node -e "require('playwright').chromium.launch().then(async b=>{const p=await b.newPage({viewport:{width:1254,height:1254}});await p.goto('file://'+process.cwd()+'/docs/branding/taybah-mosque-logo.svg');await p.screenshot({path:'docs/branding/taybah-nabawi-logo.png'});await b.close()})"
  node apps/mobile/scripts/generate-brand-assets.mjs
  node apps/mobile/scripts/generate-splash-logo-layers.mjs
"""
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BRANDING = ROOT / 'docs/branding'
GOLD = '#a07c33'
CREAM = '#F9F7F2'

# The mosque's own unit box, and where it sits on the 1254 logo canvas.
VIEW = (8, 11, 84, 83.5)
CANVAS = 1254
MOSQUE_HEIGHT = 700
MOSQUE_TOP = 81
K = MOSQUE_HEIGHT / VIEW[3]
MOSQUE_LEFT = (CANVAS - VIEW[2] * K) / 2
WORD_WIDTH, WORD_TOP, LATIN_TOP = 600, 806, 1089



def mean_brush_width(segs, w0, w1, closed):
    """The brush stroke's average width along its length, in mosque units (same profile as brush())."""
    straight = all(s[0] == 'L' for s in segs)
    n = 200
    total = 0.0
    for i in range(n + 1):
        t = i / n
        if straight:
            w = w1 + (w0 - w1) * math.sin(math.pi * t) ** 0.6
        elif closed:
            w = w1 + (w0 - w1) * (0.5 + 0.5 * math.cos(2 * math.pi * t))
        else:
            w = (w1 + (w0 - w1) * (1 - t) ** 1.6) * min(1, 0.55 + t * 9)
        total += w
    return total / (n + 1)


def f(v):
    return f'{v:.3f}'.rstrip('0').rstrip('.')


def cubic(p0, c1, c2, p1, t):
    u = 1 - t
    return (u**3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * p1[0],
            u**3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * p1[1])


def sample(segs, n=60):
    pts = []
    for s in segs:
        if s[0] == 'L':
            a, b = s[1], s[2]
            seq = [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]
        else:
            seq = [cubic(s[1], s[2], s[3], s[4], i / n) for i in range(n + 1)]
        pts.extend(seq if not pts else seq[1:])
    return pts


def brush(segs, w0, w1, closed=False):
    """A brush stroke along segs. Curves: width w0 where the brush lands, easing to w1 at the tail.
    Straight strokes: thin at both ends and fullest in the middle, so mirrored pairs stay symmetric."""
    straight = all(s[0] == 'L' for s in segs)
    pts = sample(segs)
    d = [0.0]
    for i in range(1, len(pts)):
        d.append(d[-1] + math.dist(pts[i - 1], pts[i]))
    total = d[-1] or 1
    left, right = [], []
    for i, p in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, len(pts) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(tx, ty) or 1
        nx, ny = -ty / ln, tx / ln
        t = d[i] / total
        if straight:
            w = w1 + (w0 - w1) * math.sin(math.pi * t) ** 0.6
        elif closed:
            w = w1 + (w0 - w1) * (0.5 + 0.5 * math.cos(2 * math.pi * t))
        else:
            w = w1 + (w0 - w1) * (1 - t) ** 1.6
            w *= min(1, 0.55 + t * 9)          # the brush lands with a soft round head
        h = w / 2
        left.append((p[0] + nx * h, p[1] + ny * h))
        right.append((p[0] - nx * h, p[1] - ny * h))
    poly = left + right[::-1]
    out = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in poly) + ' Z'
    if straight or closed:
        return out
    hx, hy = pts[0]
    r = (w0 * 0.55) / 2
    out += f' M{f(hx - r)} {f(hy)} a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0 a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0 Z'
    return out


def circle_segs(cx, cy, r):
    k = 0.5523 * r
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    ctl = [((cx + k, cy - r), (cx + r, cy - k)), ((cx + r, cy + k), (cx + k, cy + r)),
           ((cx - k, cy + r), (cx - r, cy + k)), ((cx - r, cy - k), (cx - k, cy - r))]
    return [('C', pts[i], ctl[i][0], ctl[i][1], pts[(i + 1) % 4]) for i in range(4)]


def L(a, b):
    """A straight line, drawn bottom-up when vertical (the pen rises, like the building)."""
    if abs(a[0] - b[0]) < 1e-9 and a[1] < b[1]:
        a, b = b, a
    return [('L', a, b)]


def C(p0, c1, c2, p1):
    return ('C', p0, c1, c2, p1)


def mirror(segs):
    out = []
    for s in segs:
        if s[0] == 'L':
            out.append(('L', (100 - s[1][0], s[1][1]), (100 - s[2][0], s[2][1])))
        else:
            out.append(('C',) + tuple((100 - p[0], p[1]) for p in s[1:]))
    return out


MAIN, FINE, HAIR = (0.95, 0.24), (0.66, 0.19), (0.46, 0.15)

# Splash draw windows, on the splash's 0 -> 1 progress: base, dome, minarets bottom-up, finials last.
WINDOWS = {
    'base': (0.00, 0.20),
    'dome': (0.06, 0.32),
    'ribs': (0.20, 0.40),
    'shaft': (0.08, 0.30),
    'balcony': (0.26, 0.42),
    'upper': (0.34, 0.50),
    'top': (0.42, 0.56),
    'finial': (0.48, 0.62),
    'detail': None,   # small brackets: they arrive with the brush fade, not as pen strokes
}


def mosque_strokes():
    """(group, segs, width, closed) for every line of the mosque."""
    s = []

    def add(group, segs, w=MAIN, closed=False, mirrored=False):
        s.append((group, segs, w, closed))
        if mirrored:
            s.append((group, mirror(segs), w, closed))

    dome_l = [C((25, 85.5), (23.5, 69), (37, 57.5), (50, 51))]
    add('dome', dome_l, mirrored=True)
    add('ribs', L((50, 53), (50, 85.5)), FINE)
    add('ribs', [C((49, 53.5), (42, 60), (37.5, 70), (37, 85.5))], FINE, mirrored=True)
    add('base', [('L', (14, 85.5), (86, 85.5))], FINE)
    add('base', [('L', (10, 89.2), (90, 89.2))], FINE)
    add('base', [('L', (10, 93.2), (90, 93.2))], MAIN)
    for x0, x1, y0, y1 in ((14, 86, 85.5, 89.2), (10, 90, 89.2, 93.2)):
        add('base', L((x0, y0), (x0, y1)), HAIR)
        add('base', L((x1, y0), (x1, y1)), HAIR)
    add('finial', [C((45.5, 51.3), (45.5, 47.4), (48.4, 46.2), (50, 44.2))], FINE, mirrored=True)
    add('finial', L((50, 44.2), (50, 37.2)), HAIR)
    add('finial', circle_segs(50, 40.6, 1.05), HAIR, closed=True)
    add('finial', circle_segs(50, 35.8, 1.4), HAIR, closed=True)

    cx = 20.8
    m = [
        ('shaft', L((cx - 3.4, 54), (cx - 3.4, 85.5)), MAIN, False),
        ('shaft', L((cx + 3.4, 54), (cx + 3.4, 85.5)), MAIN, False),
        ('balcony', [('L', (cx - 5.4, 50.6), (cx + 5.4, 50.6))], FINE, False),
        ('balcony', [('L', (cx - 5.4, 53.2), (cx + 5.4, 53.2))], FINE, False),
        ('balcony', L((cx - 5.4, 50.6), (cx - 5.4, 53.2)), HAIR, False),
        ('balcony', L((cx + 5.4, 50.6), (cx + 5.4, 53.2)), HAIR, False),
    ]
    m += [('detail', L((cx - 4 + i * 2, 53.4), (cx - 4 + i * 2, 55.2)), HAIR, False) for i in range(5)]
    m += [
        ('upper', L((cx - 2.9, 38.6), (cx - 2.9, 50.4)), FINE, False),
        ('upper', L((cx + 2.9, 38.6), (cx + 2.9, 50.4)), FINE, False),
    ]
    for wx in (cx - 1.25, cx + 1.25):
        m.append(('upper', [C((wx - 0.7, 48.2), (wx - 0.7, 44.4), (wx - 0.7, 43.6), (wx, 43)),
                            C((wx, 43), (wx + 0.7, 43.6), (wx + 0.7, 44.4), (wx + 0.7, 48.2))], HAIR, False))
    m += [
        ('balcony', [('L', (cx - 4.6, 35.8), (cx + 4.6, 35.8))], FINE, False),
        ('balcony', [('L', (cx - 4.6, 38.4), (cx + 4.6, 38.4))], FINE, False),
        ('balcony', L((cx - 4.6, 35.8), (cx - 4.6, 38.4)), HAIR, False),
        ('balcony', L((cx + 4.6, 35.8), (cx + 4.6, 38.4)), HAIR, False),
    ]
    m += [('detail', L((cx - 3 + i * 2, 38.6), (cx - 3 + i * 2, 40.1)), HAIR, False) for i in range(4)]
    m += [
        ('top', L((cx - 2.1, 29.6), (cx - 2.1, 35.6)), FINE, False),
        ('top', L((cx + 2.1, 29.6), (cx + 2.1, 35.6)), FINE, False),
        ('top', [('L', (cx - 2.9, 29.4), (cx + 2.9, 29.4))], FINE, False),
        ('top', [C((cx - 2.1, 29.2), (cx - 4.2, 25.6), (cx, 23.6), (cx, 20.6))], FINE, False),
        ('top', [C((cx + 2.1, 29.2), (cx + 4.2, 25.6), (cx, 23.6), (cx, 20.6))], FINE, False),
        ('finial', L((cx, 20.6), (cx, 14.6)), HAIR, False),
        ('finial', circle_segs(cx, 17.6, 0.8), HAIR, True),
        ('finial', circle_segs(cx, 13.4, 1.15), HAIR, True),
    ]
    for group, segs, w, closed in m:
        add(group, segs, w, closed, mirrored=True)
    return s


def lineart_svg(strokes):
    paths = ''.join(f'<path d="{brush(segs, w[0], w[1], closed)}"/>' for _, segs, w, closed in strokes)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(f(v) for v in VIEW)}">'
            f'<g fill="{GOLD}" fill-rule="nonzero">{paths}</g></svg>')


def inner(svg):
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    return vb, svg[svg.index('>') + 1:svg.rindex('</svg>')]


def logo_svg(lineart):
    vb, body = inner(lineart)
    parts = [f'<svg x="{f(MOSQUE_LEFT)}" y="{MOSQUE_TOP}" width="{f(VIEW[2] * K)}" height="{MOSQUE_HEIGHT}" viewBox="{vb}">{body}</svg>']
    ar_vb, ar = inner((BRANDING / 'taybah-wordmark-ar.svg').read_text())
    ar_w, ar_h = map(float, ar_vb.split()[2:])
    scale = WORD_WIDTH / ar_w
    parts.append(f'<svg x="{f((CANVAS - WORD_WIDTH) / 2)}" y="{WORD_TOP}" width="{WORD_WIDTH}" '
                 f'height="{f(ar_h * scale)}" viewBox="{ar_vb}">{ar}</svg>')
    la_vb, la = inner((BRANDING / 'taybah-wordmark-latin.svg').read_text())
    la_w, la_h = map(float, la_vb.split()[2:])
    parts.append(f'<svg x="{f((CANVAS - la_w * scale) / 2)}" y="{LATIN_TOP}" width="{f(la_w * scale)}" '
                 f'height="{f(la_h * scale)}" viewBox="{la_vb}">{la}</svg>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS}" height="{CANVAS}" viewBox="0 0 {CANVAS} {CANVAS}">'
            f'<rect width="{CANVAS}" height="{CANVAS}" fill="{CREAM}"/>' + ''.join(parts) + '</svg>')


def to_canvas(p):
    return (MOSQUE_LEFT + (p[0] - VIEW[0]) * K, MOSQUE_TOP + (p[1] - VIEW[1]) * K)


def centreline(segs):
    start = to_canvas(segs[0][1])
    d = f'M{start[0]:.1f} {start[1]:.1f}'
    for s in segs:
        if s[0] == 'L':
            e = to_canvas(s[2])
            d += f' L{e[0]:.1f} {e[1]:.1f}'
        else:
            c1, c2, e = (to_canvas(p) for p in s[2:])
            d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {e[0]:.1f} {e[1]:.1f}'
    pts = [to_canvas(p) for p in sample(segs)]
    length = sum(math.dist(pts[i - 1], pts[i]) for i in range(1, len(pts)))
    return d, length


def strokes_ts(strokes):
    rows = []
    for i, (group, segs, w, closed) in enumerate(strokes):
        window = WINDOWS[group]
        if window is None:
            continue
        d, length = centreline(segs)
        width = mean_brush_width(segs, w[0], w[1], closed) * K
        rows.append(f"  {{ id: '{group}-{i}', d: '{d}', length: {length:.1f}, width: {width:.2f}, "
                    f"segment: [{window[0]}, {window[1]}] }},")
    return (
        '// Generated by apps/mobile/scripts/generate-mosque-logo.py from the line-art mosque (ADR 0088).\n'
        '// Do not edit by hand.\n\n'
        'import type { Outline } from \'./svg-path\';\n\n'
        'export type SplashMosqueStroke = Outline & {\n'
        '  id: string;\n'
        '  /** Pen width: the brush stroke\'s average width, in the 1254-unit logo canvas (SPLASH_LOGO_VIEWBOX). */\n'
        '  width: number;\n'
        '  /** Draw window on the splash\'s 0 → 1 progress. */\n'
        '  segment: readonly [number, number];\n'
        '};\n\n'
        '// The mosque\'s centrelines in draw order: base, dome, minarets bottom-up, finials last.\n'
        'export const splashMosqueStrokes: readonly SplashMosqueStroke[] = [\n'
        + '\n'.join(rows) + '\n] as const;\n'
    )


def main():
    strokes = mosque_strokes()
    lineart = lineart_svg(strokes)
    (BRANDING / 'taybah-mosque-lineart.svg').write_text(lineart)
    (BRANDING / 'taybah-mosque-logo.svg').write_text(logo_svg(lineart))
    out = ROOT / 'apps/mobile/src/shared/ui/splash-mosque-strokes.ts'
    out.write_text(strokes_ts(strokes))
    print('wrote', BRANDING / 'taybah-mosque-lineart.svg', BRANDING / 'taybah-mosque-logo.svg', out)


if __name__ == '__main__':
    main()
