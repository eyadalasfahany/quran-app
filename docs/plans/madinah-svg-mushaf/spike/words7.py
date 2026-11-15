"""v7: DP split with per-word ayah-span constraint (path order is left-to-right = reverse reading order)."""
import json, sys
from words2 import page_boxes, rects, split_lines
from words3 import line_bands
from words6 import verse_keys

PEN_NO_BASE = 1000.0
PEN_OUT = 500.0

def split(seq, spans, base):
    """seq in path order; spans[k] = (x0, x1) allowed x-range for group k (left to right)."""
    m, n = len(seq), len(spans)
    INF = float('inf')
    best = [[INF] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    best[0][0] = 0.0
    for i in range(m):
        pass
    for k in range(1, n + 1):
        a0, a1 = spans[k - 1]
        for i in range(k - 1, m):
            if best[k - 1][i] == INF:
                continue
            lo, hi, has = INF, -INF, False
            for j in range(i, m):
                lo, hi = min(lo, seq[j][0]), max(hi, seq[j][2]); has = has or base[j]
                c = (hi - lo) + (0 if has else PEN_NO_BASE)
                cx = (lo + hi) / 2
                if not (a0 - 0.5 <= cx <= a1 + 0.5):
                    c += PEN_OUT
                v = best[k - 1][i] + c
                if v < best[k][j + 1]:
                    best[k][j + 1], back[k][j + 1] = v, i
    cuts, j = [], m
    for k in range(n, 0, -1):
        i = back[k][j]; cuts.append((i, j)); j = i
    return cuts[::-1]

def main():
    data, tanzil, pages = sys.argv[1], sys.argv[2], sys.argv[3:]
    vk = verse_keys(tanzil)
    tw = tb = 0
    for pg in pages:
        svg = open(f'{data}/{pg}.svg', encoding='utf-8').read()
        ayahs = json.load(open(f'{data}/{pg}.json'))
        layout = json.load(open(f'{data}/{pg}-layout.json'))
        boxes = page_boxes(svg); bands = line_bands(ayahs)
        hs = sorted(r[3] - r[1] for ay in ayahs for r in rects(ay['polygon'])); h = hs[len(hs) // 4]
        arect = {}
        for ay in ayahs:
            for r in split_lines(rects(ay['polygon']), h):
                arect.setdefault((ay['surahNumber'], ay['ayahNumber']), []).append(r)
        lines = {}
        for w in layout:
            if w['char_type'] == 'word':
                lines.setdefault(w['line'], []).append(w)
        out, bad = [], 0
        for (y0, y1), ln in zip(bands, sorted(lines)):
            words = sorted(lines[ln], key=lambda w: (w['verse_id'], w['position_in_verse']))
            cy = (y0 + y1) / 2
            def span_of(w):
                rs = [r for r in arect.get(vk[w['verse_id'] - 1], []) if r[1] - 0.5 <= cy <= r[3] + 0.5]
                return (min(r[0] for r in rs), max(r[2] for r in rs)) if rs else (-1e9, 1e9)
            spans = [span_of(w) for w in reversed(words)]
            seq = [b for b in boxes if y0 <= (b[1] + b[3]) / 2 < y1]
            base = [(b[3] - b[1]) >= 0.30 * (y1 - y0) for b in seq]
            groups = split(seq, spans, base)
            for (i, j), (a0, a1) in zip(groups, spans):
                x0 = min(seq[t][0] for t in range(i, j)); x1 = max(seq[t][2] for t in range(i, j))
                ok = a0 - 0.5 <= (x0 + x1) / 2 <= a1 + 0.5 and any(base[t] for t in range(i, j))
                bad += 0 if ok else 1
                out.append((x0, y0, x1, y1, ok))
        tw += len(out); tb += bad
        print(f'page {pg}: words {len(out)}, groups violating span/base {bad}')
        rs = ''.join(f'<rect x="{x0:.2f}" y="{y0:.2f}" width="{x1-x0:.2f}" height="{y1-y0:.2f}" fill="hsla({(i*47)%360},80%,55%,0.28)" stroke="{"red" if not ok else "hsl(%d,80%%,40%%)" % ((i*47)%360)}" stroke-width="{1.2 if not ok else 0.3}"/>' for i,(x0,y0,x1,y1,ok) in enumerate(out))
        body = svg[svg.find('<svg'):].replace('</svg>', rs + '</svg>', 1)
        open(f'{data}/{pg}-v7.html', 'w', encoding='utf-8').write(f'<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#fff}}svg{{width:1035px;height:1650px}}</style>{body}')
    print(f'total {tw}, violations {tb}')

if __name__ == '__main__':
    main()
