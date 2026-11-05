"""ASR anchors: where the recitation says each ayah starts, from the 30 s transcript chunks.

For each ayah the first few words are matched (rapidfuzz partial_ratio) against each chunk. The ayah's
anchor is the first chunk of a run of matching chunks, so it marks where the ayah starts. Ayahs whose
text repeats another ayah of the surah (refrains) and very short ayahs are dropped. Anchors are kept
along the longest subsequence that increases in both ayah number and chunk time.
"""

import bisect

from rapidfuzz import fuzz

from .text import norm

HEAD_WORDS = 3  # words matched at the start of each ayah
MIN_HEAD_CHARS = 8
MIN_AYAH_WORDS = 3
MATCH_THRESHOLD = 80  # partial_ratio of the head inside a chunk
REPEAT_THRESHOLD = 85  # ratio between two whole ayahs: at or above this, both are dropped


def _surah_ayahs(surah: int, ayahs: dict) -> list[tuple[int, str]]:
    return sorted((a, t) for (s, a), t in ayahs.items() if s == surah)


def usable_ayahs(surah: int, ayahs: dict) -> dict[int, str]:
    """Ayahs that can anchor: long enough, and not repeated (near-duplicate) elsewhere in the surah."""
    items = _surah_ayahs(surah, ayahs)
    keys = {a: norm(t) for a, t in items}
    out = {}
    for a, _ in items:
        if len(keys[a].split()) < MIN_AYAH_WORDS:
            continue
        repeated = any(
            b != a and fuzz.ratio(keys[a], keys[b]) >= REPEAT_THRESHOLD for b, _ in items
        )
        if not repeated:
            out[a] = " ".join(keys[a].split()[:HEAD_WORDS])
    return out


def _longest_increasing(pairs: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Longest subsequence (by ayah order) with strictly increasing chunk index. pairs: (ayah, chunk)."""
    pairs = sorted(pairs)
    tails: list[int] = []  # chunk index of the best chain ending with length k+1
    tail_pos: list[int] = []
    prev = [-1] * len(pairs)
    for idx, (_, c) in enumerate(pairs):
        k = bisect.bisect_left(tails, c)
        if k == len(tails):
            tails.append(c)
            tail_pos.append(idx)
        else:
            tails[k] = c
            tail_pos[k] = idx
        prev[idx] = tail_pos[k - 1] if k > 0 else -1
    chain = []
    idx = tail_pos[-1] if tail_pos else -1
    while idx != -1:
        chain.append(pairs[idx])
        idx = prev[idx]
    return list(reversed(chain))


def ayah_anchors(chunks: list[dict], surah: int, ayahs: dict) -> dict[int, float]:
    """ayah number -> start time in seconds (the start of the chunk where the ayah begins)."""
    heads = usable_ayahs(surah, ayahs)
    texts = [norm(c["text"]) for c in chunks]
    candidates = []
    for a, head in heads.items():
        if len(head) < MIN_HEAD_CHARS:
            continue
        hits = [fuzz.partial_ratio(head, t) >= MATCH_THRESHOLD for t in texts]
        for c, hit in enumerate(hits):
            if hit and (c == 0 or not hits[c - 1]):
                candidates.append((a, c))
                break  # the first chunk of the first run
    chain = _longest_increasing(candidates)
    return {a: chunks[c]["start_s"] for a, c in chain}

