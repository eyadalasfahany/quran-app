"""Step 3: word-level forced alignment (wav2vec2 CTC, CPU, 20 s emission chunks).

Output words are the original Tanzil tokens. Normalisation is only the matching key.
Tokens that normalise to nothing (waqf marks) are skipped, so `position` can have gaps.

Long surahs are aligned in windows. forced_align's backpointer table is frames x tokens,
so one pass over a whole surah does not fit in memory. Each window commits whole ayahs and
aligns a look-ahead of whole ayahs after them; the next window starts after the last committed word.
Each window ends with a star (wildcard) token that absorbs audio after the last real token.
"""

import math
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
import torchaudio.functional as F
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

from .models import ALIGN_MODEL, ALIGN_REVISION, DEVICE, SAMPLE_RATE, TORCH_THREADS
from .text import norm

CHUNK_SECONDS = 20
BASMALA_AYAH = (1, 1)
BASMALA_FREE_SURAHS = (1, 9)  # Tanzil keeps the basmala out of these surahs' ayah 1
MAX_TOKENS = 1500  # committed tokens per window
LOOKAHEAD_TOKENS = 200  # look-ahead = whole ayahs until it holds this many tokens (0 = one ayah)
SLACK = 2.0  # window audio is this many times the expected duration of its tokens
STAR_PENALTY = 1.0  # star log-prob = per-frame best label minus this (0 = equal to the best label)
FRAMES_PER_SECOND = 50  # wav2vec2 frame stride is 20 ms
SLACK_FRAMES = 10 * FRAMES_PER_SECOND  # +10 s on every window estimate
MAX_RETRIES = 3  # each retry doubles the window estimate
ANCHOR_WINDOW_S = 30.0  # an anchored ayah starts within its ASR chunk, 30 s
ANCHOR_TOLERANCE_S = 5.0  # an anchored ayah may start this far outside its ASR interval
PAUSE_NEAR_S = 5.0  # a pause within this many seconds of the target is used as the cut
BASMALA_DECISION_SECONDS = 60  # audio used to decide whether the basmala is recited
BASMALA_DECISION_TOKENS = 200  # ayah 1 and the words after it, used for both basmala variants
BASMALA_MARGIN = 0.02  # omitted wins only when its mean log-prob per frame beats recited by more than this


@dataclass(frozen=True)
class Window:
    commit: tuple[int, int]  # ayah indices [i, j) whose words are kept
    aligned_end: int  # ayah index end (exclusive) of the aligned tokens
    tokens: int  # tokens in the aligned range
    est_frames: int  # audio frames requested for this window before any retry
    last: bool  # final window: audio runs to the end of the file


def plan_windows(
    word_tokens_per_ayah: list[int],
    total_frames: int,
    max_tokens: int,
    lookahead_tokens: int = LOOKAHEAD_TOKENS,
    slack: float = SLACK,
) -> list[Window]:
    """Group ayahs into windows of at most `max_tokens` committed tokens, each with a look-ahead.

    The look-ahead is at least one ayah and grows by whole ayahs until it holds `lookahead_tokens`.
    An ayah alone over `max_tokens` is still its own window. Commit ranges partition all ayahs.
    """
    if max_tokens < 1:
        raise ValueError("max_tokens must be at least 1")
    if lookahead_tokens < 0:
        raise ValueError("lookahead_tokens must not be negative")
    if slack <= 0:
        raise ValueError("slack must be positive")
    n = len(word_tokens_per_ayah)
    total_tokens = sum(word_tokens_per_ayah)
    frames_per_token = total_frames / total_tokens if total_tokens else 0.0
    windows = []
    i = 0
    while i < n:
        j = i + 1
        size = word_tokens_per_ayah[i]
        while j < n and size + word_tokens_per_ayah[j] <= max_tokens:
            size += word_tokens_per_ayah[j]
            j += 1
        last = j >= n
        if last:
            aligned_end = n
        else:
            aligned_end = j + 1
            look = word_tokens_per_ayah[j]
            while aligned_end < n and look < lookahead_tokens:
                look += word_tokens_per_ayah[aligned_end]
                aligned_end += 1
        aligned_tokens = sum(word_tokens_per_ayah[i:aligned_end])
        est = math.ceil(aligned_tokens * frames_per_token * slack) + SLACK_FRAMES
        windows.append(Window((i, j), aligned_end, aligned_tokens, est, last))
        i = j
    return windows


def _load():
    torch.set_num_threads(TORCH_THREADS)
    proc = Wav2Vec2Processor.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION)
    model = Wav2Vec2ForCTC.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION).eval()
    return proc, model.to(DEVICE)


EMISSION_CONTEXT_S = 5  # overlap on each side of a 20 s chunk: the model sees 30 s, keeps the centre 20 s
FRAME_SAMPLES = 320  # wav2vec2 frame stride: 20 ms at 16 kHz


def emission_key(audio_sha256: str, overlap: bool = False) -> str:
    """Cache key: the audio file, the align model revision, and (when overlapping) the chunking."""
    key = f"{audio_sha256}|{ALIGN_MODEL}@{ALIGN_REVISION}"
    return key if not overlap else f"{key}|chunk={CHUNK_SECONDS}s|context={EMISSION_CONTEXT_S}s"


def load_emissions(path: Path, key: str) -> torch.Tensor | None:
    """Cached log-probs for `key`, or None when the file is missing or was made for other audio/model."""
    if not path.is_file():
        return None
    with np.load(path, allow_pickle=False) as z:
        if str(z["key"]) != key:
            return None
        return torch.from_numpy(z["em"].copy())


def save_emissions(path: Path, key: str, em: torch.Tensor) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(path, key=np.array(key), em=em.numpy().astype(np.float32))


def compute_emissions(wav: np.ndarray, overlap: bool = False) -> torch.Tensor:
    """Full-file wav2vec2 log-probs, one row per 20 ms frame.

    Each 20 s chunk is run with EMISSION_CONTEXT_S of audio on each side, so the model has context at
    the chunk edges. Only the frames whose start falls inside the chunk's own 20 s are kept, so the
    frame count and timebase match the non-overlapping version.
    """
    proc, model = _load()
    hop = CHUNK_SECONDS * SAMPLE_RATE
    n = len(wav)
    emissions = []
    ctx = EMISSION_CONTEXT_S * SAMPLE_RATE if overlap else 0
    with torch.inference_mode():
        for i, ws, we, f0, f1 in chunk_bounds(n, hop, ctx):
            iv = proc(wav[ws:we], sampling_rate=SAMPLE_RATE, return_tensors="pt").input_values
            logp = torch.log_softmax(model(iv.to(DEVICE)).logits, -1)[0].cpu()
            emissions.append(logp[f0:f1])
    return torch.cat(emissions)


def chunk_bounds(n: int, hop: int, ctx: int) -> list[tuple[int, int, int, int, int]]:
    """For each centre chunk [i, i+hop): (i, ws, we, f0, f1). The model sees samples [ws, we); its
    frames f0..f1 are the ones that start inside the centre chunk (frame f starts at ws + f*320)."""
    out = []
    for i in range(0, n, hop):
        ws = max(0, i - ctx)
        we = min(n, i + hop + ctx)
        f0 = -(-(i - ws) // FRAME_SAMPLES)  # first frame that starts at or after the chunk start
        f1 = -(-(min(n, i + hop) - ws) // FRAME_SAMPLES)  # frames that start before the chunk end
        out.append((i, ws, we, f0, f1))
    return out


def basmala_word_count(surah: int, ayahs: dict) -> int:
    """Number of leading words of ayah 1 that are the basmala. 0 when the surah has none."""
    if surah in BASMALA_FREE_SURAHS:
        return 0
    basmala = ayahs[BASMALA_AYAH]
    if not ayahs[(surah, 1)].startswith(basmala):
        return 0
    return len(basmala.split(" "))


# Opening letters (muqatta'at) are recited as letter names. Alignment keys only: the output word
# stays the Tanzil token. Keyed by (surah, ayah); the entry applies to the ayah's first non-basmala token.
MUQATTAAT = {
    (2, 1): "الف لام ميم", (3, 1): "الف لام ميم", (7, 1): "الف لام ميم صاد",
    (10, 1): "الف لام را", (11, 1): "الف لام را", (12, 1): "الف لام را", (13, 1): "الف لام ميم را",
    (14, 1): "الف لام را", (15, 1): "الف لام را", (19, 1): "كاف ها يا عين صاد", (20, 1): "طا ها",
    (26, 1): "طا سين ميم", (27, 1): "طا سين", (28, 1): "طا سين ميم", (29, 1): "الف لام ميم",
    (30, 1): "الف لام ميم", (31, 1): "الف لام ميم", (32, 1): "الف لام ميم", (36, 1): "يا سين",
    (38, 1): "صاد", (40, 1): "حا ميم", (41, 1): "حا ميم", (42, 1): "حا ميم", (43, 1): "حا ميم",
    (44, 1): "حا ميم", (45, 1): "حا ميم", (46, 1): "حا ميم", (42, 2): "عين سين قاف",
    (50, 1): "قاف", (68, 1): "نون",
}


class MuqattaatMismatch(ValueError):
    pass


def _expand_muqattaat(surah: int, ayahs: dict, out: list, table: dict) -> int:
    """Replace the alignment key of each muqatta'a token with its spelled-out letter names.

    Checks that the Tanzil token's letters match the initials of the names, so a wrong entry fails
    loudly. Returns the number of tokens expanded. Raises MuqattaatMismatch with the surah:ayah key.
    """
    n_basmala = basmala_word_count(surah, ayahs)
    expanded = 0
    for (s, a), spelled in table.items():
        if s != surah:
            continue
        first = next((i for i, (ai, pos, _, _) in enumerate(out)
                      if ai == a and (a != 1 or pos > n_basmala)), None)
        if first is None:
            raise MuqattaatMismatch(f"muqatta'at check failed for {s}:{a}: no token")
        ai, pos, w, key = out[first]
        initials = norm(" ".join(part[0] for part in spelled.split(" ")))
        if key.replace(" ", "") != initials.replace(" ", ""):
            raise MuqattaatMismatch(f"muqatta'at check failed for {s}:{a}: letters do not match the names")
        out[first] = (ai, pos, w, norm(spelled))
        expanded += 1
    return expanded


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


def align_emissions(
    em: torch.Tensor,
    tokens: list[int],
    word_of_token: list[int],
    ayah_of_word: list[int],
    blank: int,
    max_tokens: int = MAX_TOKENS,
    forced_align_fn=F.forced_align,
    trace: list | None = None,
    lookahead_tokens: int = LOOKAHEAD_TOKENS,
    slack: float = SLACK,
    star_penalty: float = STAR_PENALTY,
    leading_star: bool = True,
) -> dict[int, dict]:
    """Windowed forced alignment over ready emissions `em` [T, V].

    Returns word index -> {"start": frame, "end": frame (exclusive), "score": [token scores]}.
    `trace`, when given, receives (commit_start, commit_end, cursor, end) for each window.
    """
    total_frames = em.shape[0]

    # Ayahs in order of first appearance; words and tokens are contiguous per ayah.
    ayah_index: dict[int, int] = {}
    ayah_index_of_word = [ayah_index.setdefault(a, len(ayah_index)) for a in ayah_of_word]
    if ayah_index_of_word != sorted(ayah_index_of_word):
        raise ValueError("words must be grouped by ayah")
    ayah_nums = list(ayah_index)
    tokens_per_ayah = [0] * len(ayah_nums)
    for wi in word_of_token:
        tokens_per_ayah[ayah_index_of_word[wi]] += 1
    token_start = [0]
    for c in tokens_per_ayah:
        token_start.append(token_start[-1] + c)
    if token_start[-1] != len(tokens):
        raise ValueError("token counts do not match the words")

    windows = plan_windows(tokens_per_ayah, total_frames, max_tokens, lookahead_tokens, slack)
    sec_per_frame = 1 / FRAMES_PER_SECOND  # only used for the log line
    agg: dict = {}
    cursor = 0
    for win_index, win in enumerate(windows):
        i, j = win.commit
        lo, hi = token_start[i], token_start[win.aligned_end]
        if hi == lo:
            continue  # no alignable characters in these ayahs
        # A leading star in the first window takes audio before the first word (isti'adha, silence),
        # scored like the trailing star. A blank-scored leading star let the first word stretch over it.
        est = win.est_frames
        for attempt in range(MAX_RETRIES + 1):
            end = total_frames if win.last else min(total_frames, cursor + est)
            # Star (wildcard) token, as in torchaudio's MMS forced-alignment tutorial: one extra
            # column after the window's last token. Its score is the frame's best label minus
            # `star_penalty`, so it never beats the best real token on a frame unless penalty < 0.
            # Speech after the last real token (next ayahs, du'a, silence) goes to the star.
            window_em = em[cursor:end]
            vocab = window_em.shape[1]
            cols, lead = [window_em], []
            if leading_star and win_index == 0:
                cols.append(window_em.max(dim=1, keepdim=True).values - star_penalty)  # column vocab
                lead = [vocab]
            trail_id = vocab + len(lead)
            cols.append(window_em.max(dim=1, keepdim=True).values - star_penalty)
            window_em = torch.cat(cols, dim=1)
            targets = lead + tokens[lo:hi] + [trail_id]
            try:
                aligned, tscores = forced_align_fn(
                    window_em.unsqueeze(0), torch.tensor([targets]), blank=blank)
                break
            except (RuntimeError, ValueError) as exc:
                # Doubling only helps while the window can still grow; a window that already
                # reaches the end of the file fails the same way again.
                if attempt == MAX_RETRIES or end >= total_frames:
                    raise RuntimeError(
                        f"forced alignment failed for ayahs {ayah_nums[i]}-{ayah_nums[win.aligned_end - 1]} "
                        f"({win.tokens} tokens, frames {cursor}-{end}): {exc}") from exc
                est *= 2
        spans = [sp for sp in F.merge_tokens(aligned[0], tscores[0].exp(), blank=blank)
                 if sp.token < vocab]  # star columns (leading and trailing) have no word
        if len(spans) != hi - lo:
            raise RuntimeError(f"alignment returned {len(spans)} spans for {hi - lo} tokens")

        window_end = 0
        for ti, sp in enumerate(spans):
            wi = word_of_token[lo + ti]
            if not i <= ayah_index_of_word[wi] < j:
                continue  # look-ahead ayah: re-aligned by the next window
            start, stop = sp.start + cursor, sp.end + cursor
            r = agg.setdefault(wi, {"start": start, "end": stop, "score": []})
            r["start"] = min(r["start"], start)
            r["end"] = max(r["end"], stop)
            r["score"].append(sp.score)
            window_end = max(window_end, stop)

        if trace is not None:
            trace.append((i, j, cursor, end))
        secs = (end - cursor) * sec_per_frame
        print(f"window ayahs {ayah_nums[i]}-{ayah_nums[j - 1]} (+look-ahead to {ayah_nums[win.aligned_end - 1]}): "
              f"frames {cursor}-{end} ({end - cursor}), tokens {hi - lo}, {secs:.1f} s",
              file=sys.stderr)
        if window_end:
            cursor = min(max(window_end + 1, cursor + 1), total_frames)
    return agg


def _path_mean(em: torch.Tensor, targets: list[int], blank: int, star_penalty: float) -> float:
    """Mean log-prob per frame of the best path for `targets` (leading and trailing star, as in windows)."""
    vocab = em.shape[1]
    # Both stars score like the windows do. A blank-copy column for the lead star makes forced_align
    # place the first token one frame late at a cost, so it is not used.
    star_lead = em.max(dim=1, keepdim=True).values - star_penalty
    star_trail = em.max(dim=1, keepdim=True).values - star_penalty
    window = torch.cat([em, star_lead, star_trail], dim=1)
    _, scores = F.forced_align(window.unsqueeze(0), torch.tensor([[vocab] + targets + [vocab + 1]]), blank=blank)
    return float(scores[0].mean())


def decide_basmala(em: torch.Tensor, words: list, vocab: dict, n_basmala: int, blank: int,
                   star_penalty: float) -> dict:
    """Is the basmala recited in this file? Aligns the same first minute twice and compares the paths.

    Variant A: basmala tokens + ayah 1 + following words. Variant B: the same without the basmala.
    Both cover the same frames, so the per-frame mean is comparable. Recited unless B wins by a margin.
    """
    def ids(ws):
        return [vocab[ch] for _, _, _, key in ws for ch in key.replace(" ", "") if ch in vocab]

    is_basmala = [a == 1 and pos <= n_basmala for a, pos, _, _ in words]
    body, count = [], 0
    for w, skip in zip(words, is_basmala):
        if skip:
            continue
        if count >= BASMALA_DECISION_TOKENS:
            break
        body.append(w)
        count += len(ids([w]))
    basmala_words = [w for w, skip in zip(words, is_basmala) if skip]
    frames = em[:BASMALA_DECISION_SECONDS * FRAMES_PER_SECOND]
    recited_score = _path_mean(frames, ids(basmala_words) + ids(body), blank, star_penalty)
    omitted_score = _path_mean(frames, ids(body), blank, star_penalty)
    recited = not (omitted_score > recited_score + BASMALA_MARGIN)
    return {"recited": recited, "score_recited": recited_score, "score_omitted": omitted_score}


def anchor_cuts(
    agg: dict[int, dict],
    ayah_of_word: list[int],
    anchors: dict[int, float],
    pauses: list | None,
    tolerance_s: float = ANCHOR_TOLERANCE_S,
    window_s: float = ANCHOR_WINDOW_S,
) -> list[tuple[int, int]]:
    """Cuts for the anchored ayahs the first pass placed outside their ASR interval.

    An anchor says the ayah starts within [t, t + window_s]. When the first pass starts it more than
    `tolerance_s` outside that span, the cut goes at the nearest point of the span, moved to the pause
    closest to it inside the span when there is one. Ayahs the first pass places correctly are not cut.
    """
    starts: dict[int, int] = {}
    for wi, r in agg.items():
        a = ayah_of_word[wi]
        starts[a] = min(starts.get(a, r["start"]), r["start"])
    mids = [(s + e) / 2 for s, e in pauses or [] if e != float("inf")]
    cuts: list[tuple[int, int]] = []
    for a in sorted(anchors):
        if a not in starts:
            continue
        t = anchors[a]
        s_sec = starts[a] / FRAMES_PER_SECOND
        if t - tolerance_s <= s_sec <= t + window_s + tolerance_s:
            continue
        target = min(max(s_sec, t), t + window_s)
        near = [m for m in mids if t <= m <= t + window_s and abs(m - target) <= PAUSE_NEAR_S]
        if near:
            target = min(near, key=lambda m: abs(m - target))
        frame = round(target * FRAMES_PER_SECOND)
        if cuts and frame <= cuts[-1][1]:
            continue
        cuts.append((a, frame))
    return cuts


def align_segmented(
    em: torch.Tensor,
    tokens: list[int],
    word_of_token: list[int],
    ayah_of_word: list[int],
    blank: int,
    cuts: list[tuple[int, int]],
    leading_star: bool = True,
    **kwargs,
) -> dict[int, dict]:
    """align_emissions per segment. `cuts` are (ayah, frame): each segment starts at its ayah and frame.
    No word crosses a cut."""
    ayah_list = list(dict.fromkeys(ayah_of_word))
    starts = [(ayah_list[0], 0)] + list(cuts)
    agg: dict[int, dict] = {}
    for idx, (a0, f0) in enumerate(starts):
        a1 = cuts[idx][0] if idx < len(cuts) else None
        f1 = cuts[idx][1] if idx < len(cuts) else em.shape[0]
        wsel = [wi for wi, a in enumerate(ayah_of_word) if a >= a0 and (a1 is None or a < a1)]
        if not wsel:
            continue
        w0, w1 = wsel[0], wsel[-1] + 1
        tok_sel = [t for t, wi in enumerate(word_of_token) if w0 <= wi < w1]
        sub = align_emissions(
            em[f0:f1], [tokens[t] for t in tok_sel], [word_of_token[t] - w0 for t in tok_sel],
            ayah_of_word[w0:w1], blank, leading_star=leading_star and idx == 0, **kwargs)
        for lwi, r in sub.items():
            agg[w0 + lwi] = {"start": r["start"] + f0, "end": r["end"] + f0, "score": r["score"]}
    return agg


def load_vocab() -> tuple[dict, int]:
    """The align model's character vocabulary and the blank id."""
    proc = Wav2Vec2Processor.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION)
    vocab = proc.tokenizer.get_vocab()
    return vocab, vocab.get("<pad>", 0)


def surah_tokens(surah: int, ayahs: dict, lo: int, hi: int, recited: bool | None, vocab: dict) -> tuple[list, list, list, list]:
    """Words and tokens for ayahs lo..hi of a surah (muqatta'at applied, basmala dropped when not recited).
    Returns (word entries (ayah, position, word, key), tokens, word_of_token, ayah_of_word)."""
    sw = [w for w in _words(surah, ayahs) if lo <= w[0] <= hi]
    n_basmala = basmala_word_count(surah, ayahs)
    if recited is False:
        sw = [w for w in sw if not (w[0] == 1 and w[1] <= n_basmala)]
    table = {k: v for k, v in MUQATTAAT.items() if k[0] == surah and lo <= k[1] <= hi}
    if table:
        _expand_muqattaat(surah, ayahs, sw, table)
    tokens, wot = [], []
    for wi, (_, _, _, key) in enumerate(sw):
        for ch in key.replace(" ", ""):
            if ch in vocab:
                tokens.append(vocab[ch])
                wot.append(wi)
    return sw, tokens, wot, [w[0] for w in sw]


def align_full(
    wav: np.ndarray,
    surah: int,
    ayahs: dict,
    max_tokens: int = MAX_TOKENS,
    em: torch.Tensor | None = None,
    lookahead_tokens: int = LOOKAHEAD_TOKENS,
    slack: float = SLACK,
    star_penalty: float = STAR_PENALTY,
    leading_star: bool = True,
    basmala: str = "auto",
    anchors: dict[int, float] | None = None,
    pauses: list | None = None,
) -> tuple[list[dict], bool | None, dict | None]:
    """Word timings, basmala_recited (None when the surah has no basmala to decide), decision scores."""
    if basmala not in ("auto", "recited", "omitted"):
        raise ValueError("basmala must be auto, recited or omitted")
    if not any(s == surah for s, _ in ayahs):
        raise ValueError(f"surah {surah} is not in the Tanzil text")
    if em is None:
        em = compute_emissions(wav)
    proc = Wav2Vec2Processor.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION)
    vocab = proc.tokenizer.get_vocab()
    blank = vocab.get("<pad>", 0)

    words = _words(surah, ayahs)
    expanded = _expand_muqattaat(surah, ayahs, words, MUQATTAAT)
    print(f"muqatta'at: {expanded} opening letter groups spelled out", file=sys.stderr)
    n_basmala = basmala_word_count(surah, ayahs)
    decision = None
    if n_basmala == 0:
        recited = None
    elif basmala == "auto":
        with torch.inference_mode():
            decision = decide_basmala(em, words, vocab, n_basmala, blank, star_penalty)
        recited = decision["recited"]
        print(f"basmala: recited score {decision['score_recited']:.4f}, omitted score "
              f"{decision['score_omitted']:.4f} -> {'recited' if recited else 'omitted'}", file=sys.stderr)
    else:
        recited = basmala == "recited"
    if recited is False:
        words = [w for w in words if not (w[0] == 1 and w[1] <= n_basmala)]

    tokens, word_of_token = [], []
    for wi, (_, _, _, key) in enumerate(words):
        for ch in key.replace(" ", ""):
            if ch in vocab:
                tokens.append(vocab[ch])
                word_of_token.append(wi)
    if not tokens:
        raise ValueError("no alignable characters in the Tanzil text for this surah")

    sec_per_frame = len(wav) / SAMPLE_RATE / em.shape[0]
    ayah_of_word = [a for a, _, _, _ in words]
    settings = dict(max_tokens=max_tokens, lookahead_tokens=lookahead_tokens, slack=slack,
                    star_penalty=star_penalty)
    with torch.inference_mode():
        agg = align_emissions(em, tokens, word_of_token, ayah_of_word, blank,
                              leading_star=leading_star, **settings)
        if anchors:
            cuts = anchor_cuts(agg, ayah_of_word, anchors, pauses)
            print(f"anchor cuts: {len(cuts)} ayahs cut where the first pass left their ASR interval",
                  file=sys.stderr)
            if cuts:
                try:
                    agg = align_segmented(em, tokens, word_of_token, ayah_of_word, blank, cuts,
                                          leading_star=leading_star, **settings)
                except RuntimeError as exc:
                    print(f"anchor cuts dropped, first pass kept: {exc}", file=sys.stderr)

    result = []
    for wi in sorted(agg):
        a, pos, w, _ = words[wi]
        r = agg[wi]
        entry = {
            "surah": surah,
            "ayah": a,
            "position": pos,
            "word": w,
            "start_ms": round(r["start"] * sec_per_frame * 1000),
            "end_ms": round((r["end"] + 1) * sec_per_frame * 1000),
            "confidence": round(sum(r["score"]) / len(r["score"]), 3),
        }
        if recited is not None:
            entry["basmala"] = a == 1 and pos <= n_basmala and bool(recited)
        result.append(entry)
    return result, recited, decision


def align(
    wav: np.ndarray,
    surah: int,
    ayahs: dict,
    max_tokens: int = MAX_TOKENS,
    em: torch.Tensor | None = None,
    lookahead_tokens: int = LOOKAHEAD_TOKENS,
    slack: float = SLACK,
    star_penalty: float = STAR_PENALTY,
) -> list[dict]:
    """Word timings for one surah (see align_full for the basmala decision)."""
    return align_full(wav, surah, ayahs, max_tokens=max_tokens, em=em, lookahead_tokens=lookahead_tokens,
                      slack=slack, star_penalty=star_penalty)[0]
