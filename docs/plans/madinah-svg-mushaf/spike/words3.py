"""Spike v3: per-line word counts from the local 1441H layout, gaps cut per line.

Usage: python3 -I words3.py <data_dir> <page> [...]
"""
import json, sys
from words2 import page_boxes, rects, split_lines, MIN_H


def line_bands(ayahs):
    hs = sorted(r[3] - r[1] for ay in ayahs for r in rects(ay['polygon']))
    h = hs[len(hs) // 4]
    ys = sorted({(round(r[1], 1), round(r[3], 1)) for ay in ayahs for r in split_lines(rects(ay['polygon']), h)})
    bands = []
    for y0, y1 in ys:
        if not bands or y0 >= bands[-1][1] - 0.5:
            bands.append((y0, y1))
    return bands


def line_runs(boxes, y0, y1):
    iv = sorted((b[0], b[2]) for b in boxes if y0 <= (b[1] + b[3]) / 2 < y1 and (b[3] - b[1]) >= MIN_H * (y1 - y0))
    out = []
    for s, e in iv:
        if out and s <= out[-1][1] + 0.05:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


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
        nums = sorted(lines)
        print(f'page {pg}: svg text lines {len(bands)}, layout lines with words {len(nums)}')
        words_out, bad = [], 0
        for (y0, y1), ln in zip(bands, nums):
            n = len(lines[ln])
            rr = line_runs(boxes, y0, y1)
            gaps = sorted(((rr[k][0] - rr[k - 1][1], k) for k in range(1, len(rr))), reverse=True)
            if len(rr) < n:
                bad += 1
                print(f'  line {ln}: {n} words but only {len(rr)} runs  <- cannot separate')
                continue
            cut = {k for _, k in gaps[:n - 1]}
            margin = (gaps[n - 2][0] if n > 1 else 9) - (gaps[n - 1][0] if len(gaps) >= n else 0)
            print(f'  line {ln}: {n:>2} words, {len(rr):>2} runs, margin {margin:6.3f}')
            # runs are left-to-right; words are right-to-left
            start = rr[0][0]
            for k in range(1, len(rr) + 1):
                if k == len(rr) or k in cut:
                    words_out.append((start, y0, rr[k - 1][1], y1))
                    if k < len(rr):
                        start = rr[k][0]
        print(f'  lines that cannot separate: {bad}')
        rects_svg = ''.join(f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{x1 - x0:.2f}" height="{y1 - y0:.2f}" '
                            f'fill="hsla({(i * 47) % 360},80%,55%,0.28)" stroke="hsl({(i * 47) % 360},80%,40%)" stroke-width="0.3"/>'
                            for i, (x0, y0, x1, y1) in enumerate(words_out))
        body = svg[svg.find('<svg'):].replace('</svg>', rects_svg + '</svg>', 1)
        open(f'{data}/{pg}-v3.html', 'w', encoding='utf-8').write(
            f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#fff}}svg{{width:1035px;height:1650px}}</style>{body}')


if __name__ == '__main__':
    main()
