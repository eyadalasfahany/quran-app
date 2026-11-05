"""Transcribe one audio file with the pinned Tarteel ASR and cache it: asr_one.py AUDIO OUT.json."""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from recitation_align.audio import file_sha256, load_wav16k  # noqa: E402
from recitation_align.transcribe import cached_transcribe  # noqa: E402

audio = Path(sys.argv[1])
out = Path(sys.argv[2])
wav = load_wav16k(audio)
t0 = time.time()
cached_transcribe(wav, file_sha256(audio), out)
print(f"done {len(wav) / 16000:.0f}s audio in {time.time() - t0:.0f}s", flush=True)
