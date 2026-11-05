"""Published ayah timings (MP3Quran `ayat_timing`) normalised to the QF convention (ADR 0060 decision 8).

Standard library only, so the normaliser runs without torch. The QF convention is:
- entries with `ayah: 0` (basmala and isti'adha markers) are dropped;
- ayah 1 starts at 0, so any audible basmala falls inside its span with no word segment;
- each ayah ends where the next one starts, and the last ayah ends at the measured duration.

`normalise` never guesses. A missing ayah is reported in `missing` (the caller refuses the surah); a
start that is not strictly increasing, or not before the duration, raises PublishedError.
"""

from dataclasses import dataclass, field


class PublishedError(ValueError):
    """Published timings that cannot be used for this surah."""


@dataclass(frozen=True)
class Normalised:
    starts: dict[int, int] = field(default_factory=dict)  # ayah -> start_ms (ayah 1 is 0)
    ends: dict[int, int] = field(default_factory=dict)  # ayah -> end_ms (last ayah is the duration)
    missing: list[int] = field(default_factory=list)  # ayahs 1..N with no published row
    dropped_ayah0: int = 0  # `ayah: 0` rows removed
    end_mismatch: int = 0  # published end_time that differs from the next published start
    ayah1_published_start_ms: int | None = None  # what MP3Quran said before normalising
    published_last_end_ms: int | None = None  # MP3Quran's own last end, before the duration rule


def _int(value, what: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise PublishedError(f"{what} must be an integer")
    return value


def normalise(raw, *, surah: int, verse_count: int, duration_ms: int) -> Normalised:
    """Normalise one surah's published rows (the decoded JSON list) to QF convention.

    `verse_count` is the Tanzil ayah count of the surah. `duration_ms` is the measured duration of the
    audio file. Raises PublishedError on malformed rows, duplicates, unknown ayahs, a non-increasing
    start, or a start at or beyond the duration.
    """
    if verse_count < 1:
        raise PublishedError(f"surah {surah} has no ayahs in the Tanzil text")
    if duration_ms <= 0:
        raise PublishedError("measured duration must be positive")
    if not isinstance(raw, list):
        raise PublishedError("published timings must be a JSON list")

    dropped = 0
    rows: dict[int, dict] = {}
    for item in raw:
        if not isinstance(item, dict):
            raise PublishedError("each published row must be an object")
        ayah = _int(item.get("ayah"), "ayah")
        if ayah == 0:
            dropped += 1
            continue
        if ayah < 1 or ayah > verse_count:
            raise PublishedError(f"ayah {ayah} is not in surah {surah} ({verse_count} ayahs)")
        if ayah in rows:
            raise PublishedError(f"ayah {ayah} appears twice")
        rows[ayah] = {
            "start": _int(item.get("start_time"), "start_time"),
            "end": _int(item.get("end_time"), "end_time"),
        }

    missing = [n for n in range(1, verse_count + 1) if n not in rows]
    ayah1 = rows[1]["start"] if 1 in rows else None
    last = rows[verse_count]["end"] if verse_count in rows else None
    if missing:
        return Normalised(missing=missing, dropped_ayah0=dropped, ayah1_published_start_ms=ayah1,
                          published_last_end_ms=last)

    starts = {1: 0}
    for n in range(2, verse_count + 1):
        starts[n] = rows[n]["start"]
    previous = -1
    for n in range(1, verse_count + 1):
        if starts[n] <= previous:
            raise PublishedError(f"ayah starts are not strictly increasing at ayah {n}")
        if starts[n] >= duration_ms:
            raise PublishedError(f"ayah {n} starts at {starts[n]} ms, not before the duration {duration_ms} ms")
        previous = starts[n]

    ends = {n: starts[n + 1] for n in range(1, verse_count)}
    ends[verse_count] = duration_ms
    mismatch = sum(1 for n in range(1, verse_count) if rows[n]["end"] != starts[n + 1])
    return Normalised(starts=starts, ends=ends, dropped_ayah0=dropped, end_mismatch=mismatch,
                      ayah1_published_start_ms=ayah1, published_last_end_ms=last)
