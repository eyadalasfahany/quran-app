"""Review list: the stretches of doubtful ayahs the developer checks by ear.

A doubtful ayah is an anomaly under repair.py's rules, plus any ayah with mean confidence below 0.4
(ayah_is_anomalous already tests that). group_stretches() merges them and already extends each stretch
by one ayah on each side, so the stretches are not extended a second time. The play window runs from
3 s before the first ayah's start to 2 s after the last ayah's end.
"""

import json
from pathlib import Path

from .marks import stretch_id
from .repair import CONF_LOW, ayah_is_anomalous, ayah_stats, group_stretches, pace
from .text import norm

WINDOW_BEFORE_MS = 3000
WINDOW_AFTER_MS = 2000


def doubtful_ayahs(words: list[dict], basmala_recited) -> tuple[dict, set[int]]:
    """(per-ayah stats, doubtful ayah numbers) for one surah's words, using repair.py's rules."""
    stats = ayah_stats(words)
    p = pace(stats)
    doubtful = {a for a, s in stats.items() if ayah_is_anomalous(s, p) or s["conf"] < CONF_LOW}
    first = [w for w in words if w["ayah"] == 1 and not w.get("basmala")]
    if basmala_recited is False and first and min(first, key=lambda w: w["position"])["confidence"] < 0.5:
        doubtful.add(1)  # repair.py: ayah 1 with the basmala omitted, its first word is suspect
    return stats, doubtful


def play_window(first_start_ms: int, last_end_ms: int) -> dict:
    return {"start_ms": max(0, first_start_ms - WINDOW_BEFORE_MS), "end_ms": last_end_ms + WINDOW_AFTER_MS}


def surah_stretches(surah: int, data: dict, texts: dict[tuple[int, int], str]) -> list[dict]:
    """Review stretches of one surah file. `data` is the parsed NNN.json, `texts` maps (surah, ayah) to Tanzil."""
    words = data["words"]
    stats, doubtful = doubtful_ayahs(words, data.get("basmala_recited"))
    if not doubtful:
        return []
    ayah_list = sorted(stats)
    out = []
    for lo, hi in group_stretches(sorted(doubtful), ayah_list):
        ayahs = [a for a in ayah_list if lo <= a <= hi]
        rows = [{
            "ayah": a,
            "start_ms": stats[a]["start_ms"],
            "end_ms": stats[a]["end_ms"],
            "conf": round(stats[a]["conf"], 3),
            "doubtful": a in doubtful,
            "text": texts.get((surah, a), ""),
        } for a in ayahs]
        out.append({
            "id": stretch_id(surah, lo, hi),
            "surah": surah,
            "lo": lo,
            "hi": hi,
            "audio": f"{surah:03d}.mp3",
            "window": play_window(rows[0]["start_ms"], rows[-1]["end_ms"]),
            "low_confidence": any(r["conf"] < CONF_LOW for r in rows),
            "ayahs": rows,
        })
    return out


def order_stretches(stretches: list[dict]) -> list[dict]:
    """Low-confidence stretches first (any ayah with mean confidence below CONF_LOW), then the rest.
    Within each group the surah order is kept."""
    return sorted(stretches, key=lambda s: (not s["low_confidence"], s["surah"], s["lo"]))


def _skeleton(s: str) -> str:
    """Consonant skeleton used only to line up display and simple text: letters without alif, waw, ya."""
    return "".join(c for c in norm(s) if c not in "اوي")


def match_tokens(text: str, words: list[dict]) -> list[dict]:
    """Timings for each space-separated token of the verbatim `text`, from the aligner's `words` of one ayah.

    The aligner works on the simple text, the display is Uthmani. The two split words differently (the
    Uthmani «يَـٰبَنِىَّ» is the simple «يا بني»), so a display token is matched to one or more consecutive
    aligner words whose consonant skeletons join up to the token's. A token with no letters (a waqf mark)
    gets no timing, and so does a token with no match. The token text is never changed: joining the tokens
    with spaces gives `text` back.
    """
    ordered = sorted(words, key=lambda w: w["position"])
    keys = [_skeleton(w["word"]) for w in ordered]
    j = 0
    out = []
    for tok in text.split(" "):
        key = _skeleton(tok)
        span = None
        if key:
            joined, first = "", None
            for k in range(j, len(ordered)):
                if first is None:
                    first = k  # a word with an empty skeleton (e.g. «يا») still belongs to the span
                joined += keys[k]
                if joined == key:
                    span = (first, k)
                    break
                if not key.startswith(joined):
                    break
        if span is None:
            out.append({"text": tok, "start_ms": None, "end_ms": None})
            continue
        a, b = span
        j = b + 1
        out.append({"text": tok, "start_ms": ordered[a]["start_ms"], "end_ms": ordered[b]["end_ms"]})
    return out


def stretch_detail(data: dict, texts_by_ayah: dict[int, str], lo: int, hi: int) -> list[dict]:
    """Per ayah of lo..hi: the verbatim tokens with their aligner timings (basmala words included)."""
    by_ayah: dict[int, list[dict]] = {}
    for w in data["words"]:
        by_ayah.setdefault(w["ayah"], []).append(w)
    out = []
    for a in range(lo, hi + 1):
        text = texts_by_ayah.get(a, "")
        ws = [w for w in by_ayah.get(a, []) if not w.get("basmala")]
        starts = [w["start_ms"] for w in ws]
        ends = [w["end_ms"] for w in ws]
        out.append({
            "ayah": a,
            "start_ms": min(starts) if starts else None,
            "end_ms": max(ends) if ends else None,
            "tokens": match_tokens(text, by_ayah.get(a, [])),
        })
    return out


def build_review_list(surah_data: dict[int, dict], texts: dict[tuple[int, int], str], moshaf: str) -> dict:
    stretches = []
    for surah in sorted(surah_data):
        stretches.extend(surah_stretches(surah, surah_data[surah], texts))
    stretches = order_stretches(stretches)
    return {
        "moshaf": moshaf,
        "counts": {
            "stretches": len(stretches),
            "ayahs": sum(len(s["ayahs"]) for s in stretches),
            "surahs": len({s["surah"] for s in stretches}),
        },
        "stretches": stretches,
    }


def read_surah_files(directory: Path) -> dict[int, dict]:
    out = {}
    for path in sorted(directory.glob("[0-9][0-9][0-9].json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        out[int(path.stem)] = data
    return out


def write_review_list(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def format_ms(ms: int) -> str:
    return f"{ms // 60000}:{ms % 60000 / 1000:05.2f}"
