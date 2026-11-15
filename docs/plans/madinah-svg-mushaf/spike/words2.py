"""Throwaway spike (ADR 0090): can word boxes be derived from quran-svg pages? v2: line split, marks ignored.

Usage: python3 -I words.py <data_dir> <tanzil_uthmani.txt> <page> [<page> ...]
Writes <data_dir>/<page>-overlay.html and prints per-ayah word-count checks.
"""
import json, re, sys
from collections import defaultdict

TOK = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
ARGS = {'m': 2, 'l': 2, 'h': 1, 'v': 1, 'c': 6, 's': 4, 'q': 4, 't': 2, 'a': 7, 'z': 0}


def contours(d):
    """Yield the point list (endpoints + control points) of each subpath, absolute local coords."""
    toks = TOK.findall(d)
    i, cmd = 0, None
    x = y = sx = sy = 0.0
    pts = []
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; i += 1
            if cmd in 'zZ':
                x, y = sx, sy
                if pts: yield pts
                pts = []
                continue
        n = ARGS[cmd.lower()]
        a = [float(v) for v in toks[i:i + n]]; i += n
        rel = cmd.islower()
        c = cmd.lower()
        if c == 'm':
            if pts: yield pts
            x, y = (x + a[0], y + a[1]) if rel else (a[0], a[1])
            sx, sy = x, y
            pts = [(x, y)]
            cmd = 'l' if rel else 'L'
            continue
        if c == 'h':
            x = x + a[0] if rel else a[0]; pts.append((x, y)); continue
        if c == 'v':
            y = y + a[0] if rel else a[0]; pts.append((x, y)); continue
        if c == 'a':
            x, y = (x + a[5], y + a[6]) if rel else (a[5], a[6]); pts.append((x, y)); continue
        for k in range(0, n, 2):
            px, py = (x + a[k], y + a[k + 1]) if rel else (a[k], a[k + 1])
            pts.append((px, py))
        x, y = pts[-1]
    if pts: yield pts


def page_boxes(svg):
    """Contour bboxes in viewBox coords (y down)."""
    i = svg.find('id="content"')
    outer = re.search(r'matrix\(([-\d. ]+)\)', svg).group(1).split()
    a, b, c, d, e, f = map(float, outer)
    boxes = []
    for m in re.finditer(r'<g transform="translate\(([-\d.]+) ([-\d.]+)\)"><path d="([^"]+)"', svg[i:]):
        tx, ty = float(m.group(1)), float(m.group(2))
        for pts in contours(m.group(3)):
            xs = [a * (px + tx) + c * (py + ty) + e for px, py in pts]
            ys = [b * (px + tx) + d * (py + ty) + f for px, py in pts]
            boxes.append((min(xs), min(ys), max(xs), max(ys)))
    return boxes


def rects(poly):
    nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', poly)]
    out = []
    for k in range(0, len(nums), 8):
        xs, ys = nums[k:k + 8:2], nums[k + 1:k + 8:2]
        out.append((min(xs), min(ys), max(xs), max(ys)))
    return out


def split_lines(rs, h):
    out = []
    for x0, y0, x1, y1 in rs:
        k = max(1, round((y1 - y0) / h))
        for j in range(k):
            out.append((x0, y0 + (y1 - y0) * j / k, x1, y0 + (y1 - y0) * (j + 1) / k))
    return out


# The basmala is read from Tanzil 1:1 at run time, so no Quran text sits in this file.


def tanzil_counts(path):
    counts = {}
    basmala = None
    for line in open(path, encoding='utf-8'):
        p = line.rstrip('\n').split('|')
        if len(p) == 3 and p[0] == '1' and p[1] == '1':
            basmala = p[2]
            break
    for line in open(path, encoding='utf-8'):
        p = line.rstrip('\n').split('|')
        if len(p) == 3 and p[0].isdigit():
            toks = [t for t in p[2].split(' ') if re.search(r'[ء-يٱ]', t)]
            n = len(toks)
            if p[1] == '1' and p[0] not in ('1', '9') and p[2].startswith(basmala + ' '):
                n -= 4
            counts[(int(p[0]), int(p[1]))] = n
    return counts


MIN_H = 0.18


def runs(boxes, x0, x1, y0, y1):
    """Merge x-intervals of contours whose vertical centre is in the band and x centre in [x0, x1]."""
    iv = sorted((bx0, bx1) for bx0, by0, bx1, by1 in boxes
                if y0 <= (by0 + by1) / 2 < y1 and x0 <= (bx0 + bx1) / 2 < x1
                and (by1 - by0) >= MIN_H * (y1 - y0))
    out = []
    for s, e in iv:
        if out and s <= out[-1][1] + 0.05:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def main():
    data, tanzil, pages = sys.argv[1], sys.argv[2], sys.argv[3:]
    counts = tanzil_counts(tanzil)
    for pg in pages:
        svg = open(f'{data}/{pg}.svg', encoding='utf-8').read()
        ayahs = json.load(open(f'{data}/{pg}.json'))
        boxes = page_boxes(svg)
        words_out, report = [], []
        hs = sorted(r[3] - r[1] for ay in ayahs for r in rects(ay['polygon']))
        h = hs[len(hs) // 4]
        for ay in ayahs:
            key = (ay['surahNumber'], ay['ayahNumber'])
            segs = [runs(boxes, *r[::2], *r[1::2]) and (r, runs(boxes, r[0], r[2], r[1], r[3])) for r in split_lines(rects(ay['polygon']), h)]
            segs = [s for s in segs if s]
            gaps = []  # (size, seg index, run index of the right run)
            for si, (r, rr) in enumerate(segs):
                for k in range(1, len(rr)):
                    gaps.append((rr[k][0] - rr[k - 1][1], si, k))
            want = counts[key] - len(segs)
            gaps.sort(reverse=True)
            cut = gaps[:max(want, 0)]
            margin = (cut[-1][0] if cut else 0) - (gaps[want][0] if len(gaps) > want else 0)
            cuts = {(si, k) for _, si, k in cut}
            for si, (r, rr) in enumerate(segs):
                start = rr[0][0] if rr else r[0]
                for k in range(1, len(rr) + 1):
                    if k == len(rr) or (si, k) in cuts:
                        words_out.append((start, r[1], rr[k - 1][1], r[3]))
                        if k < len(rr): start = rr[k][0]
            report.append((key, counts[key], len(segs), len(gaps) + len(segs), round(margin, 3),
                           round(cut[-1][0], 3) if cut else None, round(gaps[want][0], 3) if len(gaps) > want else None))
        print(f'page {pg}: {len(boxes)} contours, {len(words_out)} words')
        print('  ayah      words segs runs  margin  min_cut  max_kept')
        for k, n, s, r, m, c, kept in report:
            print(f'  {k[0]}:{k[1]:<5}  {n:>4} {s:>4} {r:>4}  {m:>6}  {c}  {kept}')
        rects_svg = ''.join(f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{x1 - x0:.2f}" height="{y1 - y0:.2f}" '
                            f'fill="hsla({(i * 47) % 360},80%,55%,0.28)" stroke="hsl({(i * 47) % 360},80%,40%)" stroke-width="0.3"/>'
                            for i, (x0, y0, x1, y1) in enumerate(words_out))
        body = svg[svg.find('<svg'):].replace('</svg>', rects_svg + '</svg>', 1)
        open(f'{data}/{pg}-overlay.html', 'w', encoding='utf-8').write(
            f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#fff}}svg{{width:1035px;height:1650px}}</style>{body}')


if __name__ == '__main__':
    main()
