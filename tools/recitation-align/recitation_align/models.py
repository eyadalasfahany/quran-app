"""Model ids and pinned revisions. Both are Apache-2.0. Change a revision only with a new check run."""

ASR_MODEL = "tarteel-ai/whisper-base-ar-quran"
ASR_REVISION = "5c3c53fdf9272c4f6ee0bee09a1e5a4a615ee25c"
ALIGN_MODEL = "jonatasgrosman/wav2vec2-large-xlsr-53-arabic"
ALIGN_REVISION = "af46c2d8531b8dcbb5e23b952f739b372c2e5d2d"

DEVICE = "cpu"  # MPS hung under the sandbox
import os

TORCH_THREADS = int(os.environ.get("RECITATION_TORCH_THREADS", "8"))  # set 4 to keep a laptop usable
SAMPLE_RATE = 16000
