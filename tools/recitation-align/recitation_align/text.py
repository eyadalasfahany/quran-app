"""Arabic normalisation and Tanzil loading. Normalisation is a matching key only; Quran text is never changed."""
import re

TASHKEEL = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي", "ء": ""})


def norm(s: str) -> str:
    s = TASHKEEL.sub("", s).translate(MAP)
    s = re.sub(r"[^ء-ي ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_tanzil(path):
    ayahs = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("|")
            if len(parts) == 3 and parts[0].isdigit():
                ayahs[(int(parts[0]), int(parts[1]))] = parts[2]
    return ayahs
