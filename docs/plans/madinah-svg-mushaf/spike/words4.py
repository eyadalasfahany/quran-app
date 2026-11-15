"""Spike v4: split each line's contours, in path order, into N contiguous groups (N from the 1441H layout),
minimising the summed x-span of the groups. Usage: python3 -I words4.py <data_dir> <page> [...]"""
import json, sys
from words2 import page_boxes
from words3 import line_bands


def split(seq, n):
    """seq: bboxes in path order. Best partition into n contiguous groups by summed x-span (DP)."""
    m = len(seq)
    INF = float('inf')
    span = [[0.0] * (m + 1) for _ in range(m + 1)]
    for i in range(m):
        lo, hi = INF, -INF
        for j in range(i, m):
            lo, hi = min(lo, seq[j][0]), max(hi, seq[j][2])
            span[i][j + 1] = hi - lo
    best = [[INF] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    best[0][0] = 0.0
    for k in range(1, n + 1):
        for j in range(k, m + 1):
            for i in range(k - 1, j):
                c = best[k - 1][i] + span[i][j]
                if c < best[k][j]:
                    best[k][j], back[k][j] = c, i
    cuts, j = [], m
    for k in range(n, 0, -1):
        i = back[k][j]
        cuts.append((i, j))
        j = i
    return cuts[::-1], best[n][m]


def main():
    data, pages = sys.argv[1], sys.argv[2:]
    for pg in pages:
        svg = open(f'{data}/{pg}.svg', encoding='utf-8').read()
        ayahs = json.load(open(f'{data}/{pg}.json'))
        layout = json.load(open(f'{data}/{pg}-layout.json'))
        boxes = page_boxes(svg)
        bands = line_bands(ayahs)
        lines = {}
        for w in layout:
            if w['char_type'] == 'word':
                lines.setdefault(w['line'], []).append(w)
        words_out, overlaps = [], 0
        for (y0, y1), ln in zip(bands, sorted(lines)):
            seq = [b for b in boxes if y0 <= (b[1] + b[3]) / 2 < y1]
            n = len(lines[ln])
            groups, cost = split(seq, n)
            gb = []
            for i, j in groups:
                g = seq[i:j]
                gb.append((min(b[0] for b in g), y0, max(b[2] for b in g), y1))
            ordered = sorted(gb, key=lambda r: r[0])
            ov = sum(1 for a, b in zip(ordered, ordered[1:]) if b[0] < a[2] - 0.5)
            overlaps += ov
            words_out += gb
            print(f'page {pg} line {ln}: {n:>2} words, {len(seq):>3} contours, span sum {cost:7.2f}, overlapping pairs {ov}')
        print(f'page {pg}: {len(words_out)} word boxes, overlapping pairs {overlaps}')
        rects_svg = ''.join(f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{x1 - x0:.2f}" height="{y1 - y0:.2f}" '
                            f'fill="hsla({(i * 47) % 360},80%,55%,0.28)" stroke="hsl({(i * 47) % 360},80%,40%)" stroke-width="0.3"/>'
                            for i, (x0, y0, x1, y1) in enumerate(words_out))
        body = svg[svg.find('<svg'):].replace('</svg>', rects_svg + '</svg>', 1)
        open(f'{data}/{pg}-v4.html', 'w', encoding='utf-8').write(
            f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#fff}}svg{{width:1035px;height:1650px}}</style>{body}')


if __name__ == '__main__':
    main()
