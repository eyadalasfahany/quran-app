"""Step 2 of the prototype path: identify the surah and covered ayahs from ASR text. Matching only."""

from rapidfuzz import fuzz

from .text import norm

COVERAGE_THRESHOLD = 70
CANDIDATE_COUNT = 3
HEARD_PREFIX = 800


def _by_surah(ayahs: dict) -> dict:
    grouped: dict = {}
    for (s, a), t in ayahs.items():
        grouped.setdefault(s, []).append((a, t))
    return grouped


def identify_surah(text: str, ayahs: dict) -> tuple[int, float, list[dict]]:
    """Return (best surah, its score, top candidates as [{"surah", "score"}])."""
    heard = norm(text)
    scores = sorted(
        (
            (fuzz.partial_ratio(heard[:HEARD_PREFIX], norm(" ".join(t for _, t in v))), s)
            for s, v in _by_surah(ayahs).items()
        ),
        reverse=True,
    )
    best_score, best_surah = scores[0]
    candidates = [{"surah": s, "score": float(sc)} for sc, s in scores[:CANDIDATE_COUNT]]
    return best_surah, float(best_score), candidates


def covered_ayahs(text: str, ayahs: dict, surah: int) -> list[int]:
    """Ayah numbers of the surah whose normalised text appears in the transcript."""
    heard = norm(text)
    return [
        a for a, t in sorted(_by_surah(ayahs)[surah])
        if fuzz.partial_ratio(norm(t), heard) >= COVERAGE_THRESHOLD
    ]
