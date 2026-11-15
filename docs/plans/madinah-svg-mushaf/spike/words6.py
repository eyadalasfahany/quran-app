"""v6: v5 split, then check every word box centre lies in its own ayah's rect on that line (W2)."""
import json, sys
from words2 import page_boxes, rects, split_lines
from words3 import line_bands
from words5 import split

def verse_keys(tanzil):
    keys = []
    for line in open(tanzil, encoding='utf-8'):
        p = line.split('|')
        if len(p) == 3 and p[0].isdigit():
            keys.append((int(p[0]), int(p[1])))
    return keys

def main():
    data, tanzil, pages = sys.argv[1], sys.argv[2], sys.argv[3:]
    vk = verse_keys(tanzil)
    tot_w = tot_bad = 0
    for pg in pages:
        svg = open(f'{data}/{pg}.svg', encoding='utf-8').read()
        ayahs = json.load(open(f'{data}/{pg}.json'))
        layout = json.load(open(f'{data}/{pg}-layout.json'))
        boxes = page_boxes(svg)
        bands = line_bands(ayahs)
        hs = sorted(r[3] - r[1] for ay in ayahs for r in rects(ay['polygon'])); h = hs[len(hs) // 4]
        arect = {}
        for ay in ayahs:
            for r in split_lines(rects(ay['polygon']), h):
                arect.setdefault((ay['surahNumber'], ay['ayahNumber']), []).append(r)
        lines = {}
        for w in layout:
            if w['char_type'] == 'word':
                lines.setdefault(w['line'], []).append(w)
        for ln in lines:
            lines[ln].sort(key=lambda w: (w['verse_id'], w['position_in_verse']))
        bad = 0; nw = 0; dirs = []
        for (y0, y1), ln in zip(bands, sorted(lines)):
            seq = [b for b in boxes if y0 <= (b[1] + b[3]) / 2 < y1]
            words = lines[ln]
            base = [(b[3] - b[1]) >= 0.30 * (y1 - y0) for b in seq]
            groups, _ = split(seq, len(words), base)
            gb = [(min(seq[k][0] for k in range(i, j)), max(seq[k][2] for k in range(i, j))) for i, j in groups]
            dirs.append(gb[0][0] < gb[-1][0])  # path order left->right?
            ordered = sorted(gb)  # left to right
            for w, (x0, x1) in zip(reversed(words), ordered):  # reading order is right to left
                key = vk[w['verse_id'] - 1]
                cx = (x0 + x1) / 2; cy = (y0 + y1) / 2
                ok = any(r[0] - 0.5 <= cx <= r[2] + 0.5 and r[1] - 0.5 <= cy <= r[3] + 0.5 for r in arect.get(key, []))
                nw += 1
                if not ok:
                    bad += 1
        tot_w += nw; tot_bad += bad
        print(f'page {pg}: words {nw}, outside own ayah {bad}, path left-to-right on {sum(dirs)}/{len(dirs)} lines')
    print(f'total words {tot_w}, outside own ayah {tot_bad}')

if __name__ == '__main__':
    main()
