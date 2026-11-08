"""Word-boundary trial (plan way2quran-quality Q7h (c), ADR 0077): obadx/muaalem-model-v3_2 forced alignment inside
each QF ayah, its word starts against QF's. A CI evaluation only (`recitation-check.yml` check `boundary-model`), run
in its own venv; nothing here ships. The model weights are MIT; the `quran-muaalem` package that defines the model
class is QML-1.0 (an AI notice to end users, no advertisements), so adoption is the developer's decision.

    boundary_trial.py --ref qf-NNN.json --audio NNN.mp3 --surah N --out FILE

Control ayahs only (QF recites no repeat). Each ayah is cut at QF's own span, so this is the model's ceiling, not a
pipeline result. Words come from quran_transcript's Uthmani text, one phonetized word per QF position; an ayah whose
word count differs from QF's, or a word with no phoneme in the model's vocabulary, is skipped and counted.
"""

import argparse
import json
import sys
import time
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))
sys.path.insert(0, str(TOOL / "scripts"))

import lit_word  # noqa: E402

MODEL = "obadx/muaalem-model-v3_2"
SHIFTS = [-120, -80, -40, 40, 80]


def word_starts(token_starts: list[int], word_lens: list[int], frame_ms: float, offset_ms: int) -> list[int]:
    """The start (ms) of each word: the first frame of its first token, from per-token start frames in target order."""
    out, k = [], 0
    for n in word_lens:
        out.append(offset_ms + round(token_starts[k] * frame_ms))
        k += n
    return out


def rows_of(surah: int, ayah: int, start_ms: int, end_ms: int, starts: list[int]) -> dict:
    """One export-style row (format 1) from word starts: each word ends where the next starts, the last at the ayah end."""
    ends = starts[1:] + [end_ms]
    return {"verse_key": f"{surah}:{ayah}", "start_ms": start_ms, "end_ms": end_ms,
            "segments": [[i + 1, s, max(s + 1, e)] for i, (s, e) in enumerate(zip(starts, ends))]}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", type=Path, required=True)
    ap.add_argument("--audio", type=Path, required=True)
    ap.add_argument("--surah", type=int, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args(argv)

    import quran_transcript as qt
    import torch
    import torchaudio.functional as F
    from quran_muaalem.modeling.modeling_multi_level_ctc import Wav2Vec2BertForMultilevelCTC
    from quran_muaalem.modeling.multi_level_tokenizer import MultiLevelTokenizer
    from transformers import AutoFeatureExtractor

    from recitation_align.audio import load_wav16k

    model = Wav2Vec2BertForMultilevelCTC.from_pretrained(MODEL).eval()
    fe = AutoFeatureExtractor.from_pretrained(MODEL)
    vocab = MultiLevelTokenizer(MODEL).vocab["phonemes"]
    moshaf = qt.MoshafAttributes(rewaya="hafs", madd_monfasel_len=4, madd_mottasel_len=4, madd_mottasel_waqf=4,
                                 madd_aared_len=4)

    n = args.surah
    refs = json.loads(args.ref.read_text(encoding="utf-8"))
    wav = load_wav16k(args.audio)
    rows, ctrl, skipped, audio_s, model_s = [], [], {"count": 0, "phoneme": 0, "align": 0}, 0.0, 0.0
    for ref in refs:
        if not ref["words"] or lit_word.is_repeat(ref["words"]):
            continue
        words = qt.Aya(n, ref["ayah"]).get().uthmani_words
        if len(words) != max(w["index"] for w in ref["words"]):
            skipped["count"] += 1
            continue
        toks = [[vocab[c] for c in qt.quran_phonetizer(w, moshaf, remove_spaces=True).phonemes if c in vocab]
                for w in words]
        if not all(toks):
            skipped["phoneme"] += 1
            continue
        seg = wav[round(ref["start_ms"] * 16):round(ref["end_ms"] * 16)]
        t0 = time.perf_counter()
        feats = fe(seg, sampling_rate=16000, return_tensors="pt")
        with torch.inference_mode():
            logits = model(**feats, return_dict=False)[0]["phonemes"]
            em = torch.log_softmax(logits.float(), -1)
            try:
                ali, scores = F.forced_align(em, torch.tensor([[t for x in toks for t in x]]), blank=0)
            except (RuntimeError, ValueError):
                skipped["align"] += 1
                continue
        model_s += time.perf_counter() - t0
        audio_s += len(seg) / 16000
        spans = F.merge_tokens(ali[0], scores[0].exp())
        frame_ms = (ref["end_ms"] - ref["start_ms"]) / em.shape[1]
        starts = word_starts([s.start for s in spans], [len(x) for x in toks], frame_ms, ref["start_ms"])
        rows.append(rows_of(n, ref["ayah"], ref["start_ms"], ref["end_ms"], starts))
        ctrl.append(ref)

    errors = lit_word.start_errors(rows, ctrl, n)
    res = {"model": MODEL, "surah": n, "control_ayahs": len(ctrl), "skipped": skipped,
           "rtf_model": round(model_s / audio_s, 3) if audio_s else None, "start_errors": errors,
           "start": lit_word.stats(errors),
           "lit": {str(s): lit_word.split(rows, ctrl, n, s) for s in [0, *SHIFTS]}}
    args.out.write_text(json.dumps(res), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "start_errors"}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
