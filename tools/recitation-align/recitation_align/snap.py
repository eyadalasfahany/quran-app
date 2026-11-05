"""Pause snapping at ayah boundaries: a post-pass over word timings.

At each boundary between ayah k and ayah k+1 the boundary is the first word start of k+1 (basmala
excluded). The longest pause lying inside the window around the boundary is taken if it sits between
the start of k's last word and the end of k+1's first word. Then k's last word ends at the pause start
and k+1's first word starts at the pause end. Only those two words change, and only when both stay
non-empty. Changed words get `"snapped": true`.
"""

import math
from collections import defaultdict

SNAP_WINDOW_MS = 3000


def snap_to_pauses(words: list[dict], pauses: list[tuple[float, float]],
                   window_ms: int = SNAP_WINDOW_MS) -> tuple[int, int]:
    """Snap ayah boundaries in place. Returns (boundaries snapped, words changed).

    `words` must be one surah's words, sorted by ayah and position, as align() returns them.
    `pauses` are (start, end) in seconds.
    """
    pause_ms = [(round(s * 1000), round(e * 1000) if math.isfinite(e) else math.inf) for s, e in pauses]
    by_ayah: dict[int, list[dict]] = defaultdict(list)
    for w in words:
        if not w.get("basmala"):
            by_ayah[w["ayah"]].append(w)
    ayahs = sorted(by_ayah)
    boundaries = 0
    changed = 0
    for a, b in zip(ayahs, ayahs[1:]):
        if b != a + 1:
            continue
        last = by_ayah[a][-1]
        first = by_ayah[b][0]
        boundary = first["start_ms"]
        inside = [(s, e) for s, e in pause_ms
                  if s <= boundary + window_ms and e >= boundary - window_ms]  # overlaps the window
        if not inside:
            continue
        s, e = max(inside, key=lambda p: p[1] - p[0])
        if not (last["start_ms"] < s and e < first["end_ms"]):
            continue
        last["end_ms"] = s
        first["start_ms"] = e
        for w in (last, first):
            if not w.get("snapped"):
                w["snapped"] = True
                changed += 1
        boundaries += 1
    return boundaries, changed
