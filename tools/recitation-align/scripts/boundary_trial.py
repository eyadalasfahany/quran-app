"""Word-boundary trial (plan way2quran-quality Q7h (c), ADR 0077): a Quran-trained CTC model's forced alignment inside
each QF ayah, its word starts against QF's. A CI evaluation only (`recitation-check.yml` check `boundary-model`), run
with $TRIAL_PYTHON; nothing here ships.

    boundary_trial.py --model M --ref qf-NNN.json --audio NNN.mp3 --surah N --out FILE

Models (`--model`):
- `muaalem`: obadx/muaalem-model-v3_2 (weights MIT; the `quran-muaalem` package is QML-1.0), phonemes from
  quran_transcript's Uthmani words.
- `rabah`: rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final (Apache-2.0), 20 ms frames, letters with harakat and
  `|` between words; the words are the model repo's own `quran_text.txt` (Uthmani, Tanzil style).
- `fastconformer`: mrmuminov/quran-fastconformer-ctc-ar (CC BY 4.0), 40 ms frames, 62 Uthmani characters, loaded with
  the model repo's own `code/quranic` (NeMo); the same `quran_text.txt` words, characters outside its alphabet dropped.

Control ayahs only (QF recites no repeat). Each ayah is cut at QF's own span, so this is the model's ceiling, not a
pipeline result. An ayah whose word count differs from QF's, or a word with no token in the model's alphabet, is
skipped and counted.
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

MODELS = {"muaalem": "obadx/muaalem-model-v3_2",
          "rabah": "rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final",
          "fastconformer": "mrmuminov/quran-fastconformer-ctc-ar"}
SHIFTS = [-200, -160, -120, -80, -40, 40, 80]


def targets(word_tokens: list[list[int]], sep: int | None) -> tuple[list[int], list[int]]:
    """(the target sequence, the index of each word's first token in it); `sep` goes between words when given."""
    seq, first = [], []
    for i, toks in enumerate(word_tokens):
        if i and sep is not None:
            seq.append(sep)
        first.append(len(seq))
        seq += toks
    return seq, first


def rows_of(surah: int, ayah: int, start_ms: int, end_ms: int, starts: list[int]) -> dict:
    """One export-style row (format 1) from word starts: each word ends where the next starts, the last at the ayah end."""
    ends = starts[1:] + [end_ms]
    return {"verse_key": f"{surah}:{ayah}", "start_ms": start_ms, "end_ms": end_ms,
            "segments": [[i + 1, s, max(s + 1, e)] for i, (s, e) in enumerate(zip(starts, ends))]}


def load_text(path: Path) -> dict:
    """{(surah, ayah): [words]} from a `surah|ayah|text` file."""
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split("|")
        if len(parts) == 3 and parts[0].isdigit():
            out[(int(parts[0]), int(parts[1]))] = parts[2].split()
    return out


def backend(name: str):
    """(emissions(seg) -> [T, C] log-probs, words(surah, ayah) -> [str], tokens(word) -> [int], blank, sep)."""
    import torch

    repo = MODELS[name]
    if name == "muaalem":
        import quran_transcript as qt
        from quran_muaalem.modeling.modeling_multi_level_ctc import Wav2Vec2BertForMultilevelCTC
        from quran_muaalem.modeling.multi_level_tokenizer import MultiLevelTokenizer
        from transformers import AutoFeatureExtractor

        model = Wav2Vec2BertForMultilevelCTC.from_pretrained(repo).eval()
        fe = AutoFeatureExtractor.from_pretrained(repo)
        vocab = MultiLevelTokenizer(repo).vocab["phonemes"]
        moshaf = qt.MoshafAttributes(rewaya="hafs", madd_monfasel_len=4, madd_mottasel_len=4, madd_mottasel_waqf=4,
                                     madd_aared_len=4)

        def emissions(seg):
            with torch.inference_mode():
                logits = model(**fe(seg, sampling_rate=16000, return_tensors="pt"), return_dict=False)[0]["phonemes"]
            return torch.log_softmax(logits.float(), -1)[0]

        def tokens(w):
            return [vocab[c] for c in qt.quran_phonetizer(w, moshaf, remove_spaces=True).phonemes if c in vocab]

        return emissions, lambda s, a: qt.Aya(s, a).get().uthmani_words, tokens, 0, None

    from huggingface_hub import hf_hub_download, snapshot_download

    text = load_text(Path(hf_hub_download(MODELS["rabah"], "quran_text.txt")))
    words = lambda s, a: text.get((s, a), [])  # noqa: E731
    if name == "rabah":
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

        proc = Wav2Vec2Processor.from_pretrained(repo)
        model = Wav2Vec2ForCTC.from_pretrained(repo).eval()
        vocab = proc.tokenizer.get_vocab()

        def emissions(seg):
            with torch.inference_mode():
                logits = model(proc(seg, sampling_rate=16000, return_tensors="pt").input_values).logits
            return torch.log_softmax(logits.float(), -1)[0]

        return emissions, words, lambda w: [vocab[c] for c in w if c in vocab], vocab["<pad>"], vocab["|"]

    root = Path(snapshot_download(repo))
    sys.path.insert(0, str(root / "code"))
    from quranic.model import CharCtc

    model = CharCtc.from_release(str(root), "cpu")
    model.eval()
    chars = json.loads((root / "vocab.json").read_text(encoding="utf-8"))
    vocab = {c: i for i, c in enumerate(chars)}

    def emissions(seg):
        with torch.inference_mode():
            wave = torch.from_numpy(seg).float().unsqueeze(0)
            log_probs, _ = model(wave, torch.tensor([wave.shape[1]]))
        return torch.log_softmax(log_probs.float(), -1)[0]

    return emissions, words, lambda w: [vocab[c] for c in w if c in vocab and c != " "], len(chars), vocab.get(" ")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", choices=sorted(MODELS), default="muaalem")
    ap.add_argument("--ref", type=Path, required=True)
    ap.add_argument("--audio", type=Path, required=True)
    ap.add_argument("--surah", type=int, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args(argv)

    import torch
    import torchaudio.functional as F

    from recitation_align.audio import load_wav16k

    emissions, words_of, tokens, blank, sep = backend(args.model)
    n = args.surah
    refs = json.loads(args.ref.read_text(encoding="utf-8"))
    wav = load_wav16k(args.audio)
    rows, ctrl, skipped, audio_s, model_s = [], [], {"count": 0, "token": 0, "align": 0}, 0.0, 0.0
    for ref in refs:
        if not ref["words"] or lit_word.is_repeat(ref["words"]):
            continue
        words = words_of(n, ref["ayah"])
        if len(words) != max(w["index"] for w in ref["words"]):
            skipped["count"] += 1
            continue
        toks = [tokens(w) for w in words]
        if not all(toks):
            skipped["token"] += 1
            continue
        seq, first = targets(toks, sep)
        seg = wav[round(ref["start_ms"] * 16):round(ref["end_ms"] * 16)]
        t0 = time.perf_counter()
        em = emissions(seg)
        try:
            with torch.inference_mode():
                ali, scores = F.forced_align(em.unsqueeze(0), torch.tensor([seq]), blank=blank)
        except (RuntimeError, ValueError):
            skipped["align"] += 1
            continue
        model_s += time.perf_counter() - t0
        audio_s += len(seg) / 16000
        spans = F.merge_tokens(ali[0], scores[0].exp())
        frame_ms = (ref["end_ms"] - ref["start_ms"]) / em.shape[0]
        starts = [ref["start_ms"] + round(spans[k].start * frame_ms) for k in first]
        rows.append(rows_of(n, ref["ayah"], ref["start_ms"], ref["end_ms"], starts))
        ctrl.append(ref)

    errors = lit_word.start_errors(rows, ctrl, n)
    res = {"model": MODELS[args.model], "surah": n, "control_ayahs": len(ctrl), "skipped": skipped,
           "rtf_model": round(model_s / audio_s, 3) if audio_s else None, "start_errors": errors,
           "start": lit_word.stats(errors),
           "lit": {str(s): lit_word.split(rows, ctrl, n, s) for s in [0, *SHIFTS]}}
    args.out.write_text(json.dumps(res), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "start_errors"}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
