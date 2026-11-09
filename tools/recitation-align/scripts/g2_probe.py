"""What G2's last-word probe hears, and what longer or earlier clips would hear (plan way2quran-quality Q10). A CI report.

    g2_probe.py --aligned ALIGNED.json --audio FILE --out FILE

For the surah's last word (the aligned document's, as G2 picks it) the clip G2 cuts (0.1 s before the start, 1.6 s
after) is transcribed, then the variants: 0.3 and 0.6 s before, 3 s after, and the whole span from the last ayah's
start to the end of the audio. Each gets G2's verdict (`gate._last_word_verdict`) where it applies. Way2Quran and
MP3Quran audio only.
"""

import argparse
import json
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

VARIANTS = [("g2", 0.1, 1.6), ("pre0.3", 0.3, 1.6), ("pre0.6", 0.6, 1.6), ("post3", 0.1, 3.0), ("pre0.3post3", 0.3, 3.0)]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--aligned", type=Path, required=True)
    ap.add_argument("--audio", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args(argv)

    from recitation_align.audio import load_wav16k
    from recitation_align.gate import _last_word_verdict, _spoken
    from recitation_align.text import norm
    from recitation_align.transcribe import transcribe_at

    doc = json.loads(args.aligned.read_text(encoding="utf-8"))
    wav = load_wav16k(args.audio)
    total_s = len(wav) / 16000
    spoken = sorted(_spoken(doc["words"]), key=lambda w: (w["ayah"], w["position"]))
    last = spoken[-1]
    ctx = [norm(w["word"]) for w in spoken[-4:]]
    t = last["start_ms"] / 1000
    windows = [(max(0.0, t - pre), min(total_s, t + post)) for _, pre, post in VARIANTS]
    ayah_start = min(w["start_ms"] for w in spoken if w["ayah"] == last["ayah"]) / 1000
    windows.append((max(ayah_start, total_s - 30.0), total_s))  # Whisper hears 30 s at most: the last 30 s
    texts = [w["text"] for w in transcribe_at(wav, windows)["windows"]]
    out = {"surah": doc["surah"], "last_word": f"{last['ayah']}:{last['position']}", "start_s": round(t, 2),
           "end_s": round(last["end_ms"] / 1000, 2), "audio_s": round(total_s, 2), "ctx": ctx, "variants": []}
    for (name, pre, post), text in zip(VARIANTS, texts):
        out["variants"].append({"name": name, "pre": pre, "post": post, "heard": text, **_last_word_verdict(text, ctx)})
    out["tail"] = {"from_s": round(ayah_start, 2), "heard": texts[-1]}
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
