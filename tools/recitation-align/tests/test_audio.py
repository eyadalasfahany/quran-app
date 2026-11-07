"""Audio input with embedded cover art (Way2Quran files carry a PNG). Needs ffmpeg; skipped without it.

The fixtures are generated here (tone and silence, a flat colour PNG); nothing is downloaded.
"""

import shutil
import subprocess

import pytest

from recitation_align.audio import load_wav16k
from recitation_align.pauses import detect_pauses

pytestmark = pytest.mark.skipif(
    shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, reason="ffmpeg is not installed")

# Four seconds: tone, silence, tone, silence. The audio is the same with and without the cover.
TONE_SILENCE = ("sine=frequency=440:duration=1:sample_rate=44100[t1];anullsrc=r=44100:cl=mono:d=1[s1];"
                "sine=frequency=440:duration=1:sample_rate=44100[t2];anullsrc=r=44100:cl=mono:d=1[s2];"
                "[t1][s1][t2][s2]concat=n=4:v=0:a=1[out]")
SECONDS = 4


def run(cmd):
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", *cmd], check=True)


def make_fixtures(folder):
    """plain.mp3: tone and silence, 4 s. cover.mp3: the same audio with a PNG attached (second input)."""
    plain = folder / "plain.mp3"
    run(["-filter_complex", TONE_SILENCE, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "128k", str(plain)])
    picture = folder / "cover.png"
    run(["-f", "lavfi", "-i", "color=c=0x336699:s=64x64", "-frames:v", "1", str(picture)])
    cover = folder / "cover.mp3"
    run(["-i", str(plain), "-i", str(picture), "-map", "0:a", "-map", "1:v", "-c:a", "copy", "-c:v", "png",
         "-disposition:v", "attached_pic", "-id3v2_version", "3", str(cover)])
    return {"plain": plain, "cover": cover}


def probe(path, *args):
    out = subprocess.run(["ffprobe", "-v", "error", *args, str(path)], capture_output=True, text=True, check=True)
    return out.stdout.strip()


@pytest.fixture(scope="module")
def files(tmp_path_factory):
    return make_fixtures(tmp_path_factory.mktemp("audio"))


def test_the_cover_fixture_has_an_attached_picture_and_four_seconds_of_audio(files):
    picture = probe(files["cover"], "-select_streams", "v", "-show_entries", "stream_disposition=attached_pic",
                    "-of", "csv=p=0")
    assert picture == "1"
    audio = float(probe(files["cover"], "-select_streams", "a", "-show_entries", "stream=duration",
                        "-of", "csv=p=0"))
    assert audio == pytest.approx(SECONDS, abs=0.1)
    assert probe(files["plain"], "-select_streams", "v", "-show_entries", "stream=index", "-of", "csv=p=0") == ""


def test_cover_art_loads_as_audio_only_with_the_audio_length(files):
    samples = load_wav16k(files["cover"])
    assert samples.ndim == 1
    assert abs(len(samples) - SECONDS * 16000) <= 1600  # within 0.1 s of MP3 padding
    assert len(samples) == len(load_wav16k(files["plain"]))


def test_cover_art_does_not_change_the_pauses_found(files):
    cover = detect_pauses(files["cover"], min_silence_s=0.25)
    plain = detect_pauses(files["plain"], min_silence_s=0.25)
    assert len(cover) == len(plain) >= 1
    for (cs, ce), (ps, pe) in zip(cover, plain):
        assert cs == pytest.approx(ps, abs=0.05)
        assert ce == pytest.approx(pe, abs=0.05) or ce == ps == float("inf")
