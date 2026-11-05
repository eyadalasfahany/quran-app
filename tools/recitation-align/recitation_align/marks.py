"""Ear marks from the review page: ayah start times the developer sets by listening.

File shape (out/253-marks.json):

    {"253": {"002": {"4": 12345, "5": 15000}}, "reviewed": ["002:3-7"]}

`"253"` is the MP3Quran moshaf id, `"002"` the surah (3 digits), the inner keys are ayah numbers and the
values are start times in ms. `reviewed` holds stretch ids `NNN:a-b`. Writes are atomic (temp file in the
same folder, then rename), so a crash never leaves half a file.
"""

import json
import os
import re
import tempfile
from contextlib import suppress
from pathlib import Path

REVIEWED = "reviewed"
MOSHAF_DEFAULT = "253"
_MOSHAF = re.compile(r"[0-9]+")
_SURAH = re.compile(r"[0-9]{3}")
_AYAH = re.compile(r"[0-9]+")
_STRETCH = re.compile(r"([0-9]{3}):([0-9]+)-([0-9]+)")


def empty_marks() -> dict:
    return {REVIEWED: []}


def stretch_id(surah: int, lo: int, hi: int) -> str:
    return f"{surah:03d}:{lo}-{hi}"


def parse_stretch_id(text: str) -> tuple[int, int, int]:
    m = _STRETCH.fullmatch(text)
    if not m:
        raise ValueError(f"bad stretch id: {text!r}")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def validate_marks(data) -> dict:
    """Check the shape and return a normalised copy. Raises ValueError with the offending key."""
    if not isinstance(data, dict):
        raise ValueError("marks must be a JSON object")
    out: dict = {}
    for key, value in data.items():
        if key == REVIEWED:
            if not isinstance(value, list) or not all(isinstance(x, str) and _STRETCH.fullmatch(x) for x in value):
                raise ValueError("reviewed must be a list of NNN:a-b strings")
            out[REVIEWED] = sorted(set(value))
            continue
        if not _MOSHAF.fullmatch(key) or not isinstance(value, dict):
            raise ValueError(f"bad moshaf key: {key!r}")
        surahs: dict = {}
        for surah, ayahs in value.items():
            if not _SURAH.fullmatch(surah) or not isinstance(ayahs, dict):
                raise ValueError(f"bad surah key: {surah!r}")
            surahs[surah] = {}
            for ayah, ms in ayahs.items():
                if not _AYAH.fullmatch(ayah) or int(ayah) < 1:
                    raise ValueError(f"bad ayah key: {ayah!r}")
                if isinstance(ms, bool) or not isinstance(ms, int) or ms < 0:
                    raise ValueError(f"start of ayah {ayah} must be a non-negative integer of ms")
                surahs[surah][str(int(ayah))] = ms
        out[key] = surahs
    out.setdefault(REVIEWED, [])
    return out


def load_marks(path: Path) -> dict:
    """The marks in `path`, or an empty set when the file does not exist yet."""
    if not path.is_file():
        return empty_marks()
    return validate_marks(json.loads(path.read_text(encoding="utf-8")))


def save_marks(path: Path, data: dict) -> None:
    """Validate and write `data` atomically: a temp file in the same folder, then os.replace."""
    text = json.dumps(validate_marks(data), ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        with suppress(FileNotFoundError):
            os.unlink(tmp)
        raise


def surah_marks(marks: dict, surah: int) -> dict[int, int]:
    """Ayah -> start ms for one surah, from the first moshaf that has it."""
    key = f"{surah:03d}"
    for moshaf, surahs in marks.items():
        if moshaf == REVIEWED or not isinstance(surahs, dict):
            continue
        if key in surahs:
            return {int(a): ms for a, ms in surahs[key].items()}
    return {}


def reviewed_ranges(marks: dict, surah: int) -> list[tuple[int, int]]:
    """(first ayah, last ayah) of every reviewed stretch of `surah`."""
    out = []
    for text in marks.get(REVIEWED, []):
        s, lo, hi = parse_stretch_id(text)
        if s == surah:
            out.append((lo, hi))
    return sorted(out)
