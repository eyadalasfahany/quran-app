"""Step 3: word-level forced alignment (wav2vec2 CTC, CPU, 20 s emission chunks).

Output words are the original Tanzil tokens. Normalisation is only the matching key.
Tokens that normalise to nothing (waqf marks) are skipped, so `position` can have gaps.
"""

import numpy as np
import torch
import torchaudio.functional as F
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

from .models import ALIGN_MODEL, ALIGN_REVISION, DEVICE, SAMPLE_RATE, TORCH_THREADS
from .text import norm

CHUNK_SECONDS = 20
BASMALA_AYAH = (1, 1)
BASMALA_FREE_SURAHS = (1, 9)  # Tanzil keeps the basmala out of these surahs' ayah 1


def _load():
    torch.set_num_threads(TORCH_THREADS)
    proc = Wav2Vec2Processor.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION)
    model = Wav2Vec2ForCTC.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION).eval()
    return proc, model.to(DEVICE)


def basmala_word_count(surah: int, ayahs: dict) -> int:
    """Number of leading words of ayah 1 that are the basmala. 0 when the surah has none."""
    if surah in BASMALA_FREE_SURAHS:
        return 0
    basmala = ayahs[BASMALA_AYAH]
    if not ayahs[(surah, 1)].startswith(basmala):
        return 0
    return len(basmala.split(" "))


def _words(surah: int, ayahs: dict) -> list[tuple[int, int, str, str]]:
    """(ayah, position, original token, normalised key) for every token that has a key."""
    out = []
    for (s, a), t in sorted(ayahs.items()):
        if s != surah:
            continue
        for pos, w in enumerate(t.split(" "), 1):
            key = norm(w)
            if key:
                out.append((a, pos, w, key))
    return out


def align(wav: np.ndarray, surah: int, ayahs: dict) -> list[dict]:
    if not any(s == surah for s, _ in ayahs):
        raise ValueError(f"surah {surah} is not in the Tanzil text")
    proc, model = _load()
    vocab = proc.tokenizer.get_vocab()
    blank = vocab.get("<pad>", 0)

    words = _words(surah, ayahs)
    tokens, word_of_token = [], []
    for wi, (_, _, _, key) in enumerate(words):
        for ch in key.replace(" ", ""):
            if ch in vocab:
                tokens.append(vocab[ch])
                word_of_token.append(wi)
    if not tokens:
        raise ValueError("no alignable characters in the Tanzil text for this surah")

    n_basmala = basmala_word_count(surah, ayahs)
    size = CHUNK_SECONDS * SAMPLE_RATE
    emissions = []
    with torch.inference_mode():
        for i in range(0, len(wav), size):
            iv = proc(wav[i:i + size], sampling_rate=SAMPLE_RATE, return_tensors="pt").input_values
            emissions.append(torch.log_softmax(model(iv.to(DEVICE)).logits, -1)[0].cpu())
    em = torch.cat(emissions)
    sec_per_frame = len(wav) / SAMPLE_RATE / em.shape[0]

    aligned, tscores = F.forced_align(em.unsqueeze(0), torch.tensor([tokens]), blank=blank)
    spans = F.merge_tokens(aligned[0], tscores[0].exp(), blank=blank)

    agg: dict = {}
    for ti, sp in enumerate(spans):
        wi = word_of_token[ti]
        r = agg.setdefault(wi, {"start": sp.start, "end": sp.end, "score": []})
        r["start"] = min(r["start"], sp.start)
        r["end"] = max(r["end"], sp.end)
        r["score"].append(sp.score)

    result = []
    for wi in sorted(agg):
        a, pos, w, _ = words[wi]
        r = agg[wi]
        result.append({
            "surah": surah,
            "ayah": a,
            "position": pos,
            "word": w,
            "basmala": a == 1 and pos <= n_basmala,
            "start_ms": round(r["start"] * sec_per_frame * 1000),
            "end_ms": round((r["end"] + 1) * sec_per_frame * 1000),
            "confidence": round(sum(r["score"]) / len(r["score"]), 3),
        })
    return result
