"""Tests for the aligner-to-timing-file converter. Placeholder text only; no model, no network."""

import json

import pytest

from recitation_align import export
from recitation_align.export import Refused, build_surah, main, tanzil_index

SHA = "f0" * 32
TANZIL_LINES = ["1|1|t", "1|2|t", "2|1|t", "2|2|t", "2|3|t", "3|1|t", "3|2|t"]
FIXTURE_COUNTS = {1: 2, 2: 3, 3: 2}


def W(surah, ayah, position, start, end, word="w", **extra):
    """One aligner word with placeholder text; extra keys (basmala, confidence...) are optional."""
    return {"surah": surah, "ayah": ayah, "position": position, "word": word,
            "start_ms": start, "end_ms": end, "confidence": 0.9, **extra}


def simple_words(surah, per_ayah):
    """Positions 1..k in each ayah, one word per second, recited in order."""
    words, t = [], 0
    for ayah, k in enumerate(per_ayah, start=1):
        for position in range(1, k + 1):
            words.append(W(surah, ayah, position, t, t + 500))
            t += 1000
    return words


def make_doc(surah, words, duration_ms=9000, sha=SHA, nbytes=1234):
    return {
        "tool_version": "0.1.0",
        "asr_model": None,
        "align_model": {"id": "align/model", "revision": "rev1"},
        "audio": {"file": f"{surah:03d}.mp3", "bytes": nbytes, "sha256": sha, "duration_ms": duration_ms},
        "surah": surah,
        "identify": None,
        "words": words,
    }


@pytest.fixture
def tanzil(tmp_path):
    path = tmp_path / "tanzil.txt"
    path.write_text("\n".join(TANZIL_LINES) + "\n", encoding="utf-8")
    return path


@pytest.fixture
def index(tanzil):
    return tanzil_index(tanzil)


def convert(doc, surah, index, kind="qf", key="174", source="aligner"):
    verse_ids, counts = index
    return build_surah(doc, file_surah=surah, kind=kind, key=key, source=source,
                       audio_url="https://example.test/a.mp3", verse_ids=verse_ids, counts=counts)


def write_inputs(in_dir, docs):
    in_dir.mkdir(parents=True, exist_ok=True)
    for surah, doc in docs.items():
        (in_dir / f"{surah:03d}.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")


def write_urls(path, mapping):
    path.write_text(json.dumps(mapping), encoding="utf-8")
    return path


def write_manifest(path, surah=2, sha=SHA, nbytes=1234, url_sha=None):
    url_sha = url_sha or sha
    manifest = {"moshafs": [{"moshaf_id": 253, "files": [{
        "surah": surah, "sha256": sha, "bytes": nbytes,
        "url": f"https://audio.test/audio/mp3quran/253/{surah:03d}-{url_sha[:16]}.mp3",
    }]}]}
    path.write_text(json.dumps(manifest), encoding="utf-8")
    return path


def test_ayah_rows_are_contiguous_and_last_ends_at_measured_duration(index):
    doc = make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)
    rows = convert(doc, 2, index)["ayahs"]
    assert [r["verse_key"] for r in rows] == ["2:1", "2:2", "2:3"]
    for left, right in zip(rows, rows[1:]):
        assert left["end_ms"] == right["start_ms"]
        assert left["start_ms"] < right["start_ms"]
    assert rows[-1]["end_ms"] == 9000


def test_ayah_one_starts_at_zero_even_when_first_word_starts_later(index):
    words = simple_words(2, [2, 2, 2])
    for w in words:
        w["start_ms"] += 2500
        w["end_ms"] += 2500
    rows = convert(make_doc(2, words, duration_ms=12000), 2, index)["ayahs"]
    assert rows[0]["start_ms"] == 0
    assert rows[1]["start_ms"] == 4500
    assert rows[0]["segments"][0][1] == 2500


def test_basmala_words_are_dropped_and_missing_flag_means_not_basmala(index):
    words = [
        W(1, 1, 1, 0, 400, basmala=True),
        W(1, 1, 2, 400, 800, basmala=True),
        W(1, 1, 3, 2000, 2500),
        W(1, 1, 4, 2500, 3000, basmala=False),
        W(1, 2, 1, 4000, 4500),
    ]
    rows = convert(make_doc(1, words, duration_ms=6000), 1, index)["ayahs"]
    assert rows[0]["segments"] == [[1, 2000, 2500], [2, 2500, 3000]]
    assert rows[1]["start_ms"] == 4000
    assert rows[1]["segments"] == [[1, 4000, 4500]]


def test_waqf_gaps_in_positions_give_consecutive_qf_positions(index):
    words = [W(2, 1, 1, 0, 500), W(2, 1, 2, 600, 900), W(2, 1, 4, 1000, 1400), W(2, 1, 5, 1500, 1900)]
    words += [W(2, 2, 1, 2000, 2400), W(2, 3, 1, 3000, 3400)]
    segments = convert(make_doc(2, words, duration_ms=4000), 2, index)["ayahs"][0]["segments"]
    assert [s[0] for s in segments] == [1, 2, 3, 4]


@pytest.mark.parametrize("particle", [export.VOCATIVE, export.VOCATIVE + export.FATHA])
def test_vocative_particle_merges_with_next_token_into_one_position(index, particle):
    words = [W(2, 1, 1, 0, 300, word=particle), W(2, 1, 2, 300, 700), W(2, 1, 3, 800, 1200)]
    words += [W(2, 2, 1, 2000, 2400), W(2, 3, 1, 3000, 3400)]
    segments = convert(make_doc(2, words, duration_ms=4000), 2, index)["ayahs"][0]["segments"]
    assert segments == [[1, 0, 700], [2, 800, 1200]]


def test_vocative_with_another_diacritic_is_not_merged(index):
    kasra = "ِ"
    words = [W(2, 1, 1, 0, 300, word=export.VOCATIVE + kasra), W(2, 1, 2, 300, 700), W(2, 1, 3, 800, 1200)]
    words += [W(2, 2, 1, 2000, 2400), W(2, 3, 1, 3000, 3400)]
    segments = convert(make_doc(2, words, duration_ms=4000), 2, index)["ayahs"][0]["segments"]
    assert [s[0] for s in segments] == [1, 2, 3]


def test_particle_as_last_token_is_not_merged(index):
    words = [W(2, 1, 1, 0, 300), W(2, 1, 2, 400, 700, word=export.VOCATIVE)]
    words += [W(2, 2, 1, 2000, 2400), W(2, 3, 1, 3000, 3400)]
    rows = convert(make_doc(2, words, duration_ms=4000), 2, index)["ayahs"]
    assert rows[0]["segments"] == [[1, 0, 300], [2, 400, 700]]
    assert rows[1]["segments"] == [[1, 2000, 2400]]


def test_repeated_positions_keep_the_recited_order_and_reuse_the_qf_position(index):
    order = [1, 2, 3, 2, 3, 4]
    words = [W(2, 1, p, i * 500, i * 500 + 400) for i, p in enumerate(order)]
    words += [W(2, 2, 1, 4000, 4400), W(2, 3, 1, 5000, 5400)]
    segments = convert(make_doc(2, words, duration_ms=6000), 2, index)["ayahs"][0]["segments"]
    assert [s[0] for s in segments] == [1, 2, 3, 2, 3, 4]
    assert [s[1] for s in segments] == [0, 500, 1000, 1500, 2000, 2500]


def test_verse_id_is_global_line_index(index):
    doc2 = make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)
    doc3 = make_doc(3, [W(3, 1, 1, 0, 300), W(3, 2, 1, 1000, 1300)], duration_ms=2000)
    assert convert(doc2, 2, index)["ayahs"][0]["verse_id"] == 3
    rows3 = convert(doc3, 3, index)["ayahs"]
    assert [r["verse_id"] for r in rows3] == [6, 7]


@pytest.mark.skipif(not export.DEFAULT_TANZIL.exists(), reason="Tanzil data file not present")
def test_verse_id_of_first_ayah_of_surah_59_is_5127():
    verse_ids, _ = tanzil_index(export.DEFAULT_TANZIL)
    assert verse_ids[(59, 1)] == 5127


def test_missing_ayah_refuses_the_surah_and_writes_nothing(tmp_path, tanzil, capsys):
    words = [w for w in simple_words(2, [2, 2, 2]) if w["ayah"] != 2]
    in_dir, out = tmp_path / "in", tmp_path / "out"
    write_inputs(in_dir, {2: make_doc(2, words)})
    code = main(["--kind", "qf", "--recitation-key", "174", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--urls", str(write_urls(tmp_path / "u.json", {"2": "https://x/2.mp3"}))])
    assert code == 1
    assert "002: missing ayah 2" in capsys.readouterr().err
    assert not (out / "002.json").exists()
    assert list(out.iterdir()) == []


def test_row_with_start_not_before_end_refuses(index):
    words = [W(2, 1, 1, 0, 300), W(2, 2, 1, 5000, 5300), W(2, 3, 1, 4000, 4300)]
    with pytest.raises(Refused, match="ayah 2 starts"):
        convert(make_doc(2, words, duration_ms=6000), 2, index)


@pytest.mark.parametrize("field", ["sha", "bytes"])
def test_mp3quran_refuses_when_sha256_or_bytes_differ_from_manifest(tmp_path, tanzil, capsys, field):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    doc = make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)
    if field == "sha":
        doc["audio"]["sha256"] = "e0" * 32
    else:
        doc["audio"]["bytes"] = 999
    write_inputs(in_dir, {2: doc})
    manifest = write_manifest(tmp_path / "m.json")
    code = main(["--kind", "mp3quran", "--recitation-key", "253", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--manifest", str(manifest)])
    assert code == 1
    assert "002: audio" in capsys.readouterr().err
    assert not (out / "002.json").exists()


def test_mp3quran_refuses_when_url_hash_part_is_not_the_sha_prefix(tmp_path, tanzil, capsys):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    write_inputs(in_dir, {2: make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)})
    manifest = write_manifest(tmp_path / "m.json", url_sha="0" * 64)
    code = main(["--kind", "mp3quran", "--recitation-key", "253", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--manifest", str(manifest)])
    assert code == 1
    assert "002: manifest URL" in capsys.readouterr().err
    assert not (out / "002.json").exists()


def test_qf_requires_a_url_for_the_chapter(tmp_path, tanzil, capsys):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    write_inputs(in_dir, {2: make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)})
    urls = write_urls(tmp_path / "u.json", {"1": "https://x/1.mp3"})
    code = main(["--kind", "qf", "--recitation-key", "174", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--urls", str(urls)])
    assert code == 1
    assert "002: no audio URL for chapter 2" in capsys.readouterr().err
    assert not (out / "002.json").exists()


def test_output_is_minified_key_ordered_and_byte_identical_on_rerun(tmp_path, tanzil):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    write_inputs(in_dir, {2: make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)})
    manifest = write_manifest(tmp_path / "m.json")
    argv = ["--kind", "mp3quran", "--recitation-key", "253", "--in", str(in_dir), "--out", str(out),
            "--tanzil", str(tanzil), "--manifest", str(manifest), "--surah", "2"]
    assert main(argv) == 0
    first = (out / "002.json").read_bytes()
    assert main(argv) == 0
    assert (out / "002.json").read_bytes() == first

    text = first.decode("utf-8")
    assert not text.endswith("\n")
    assert "\n" not in text and ": " not in text and ", " not in text
    obj = json.loads(text)
    assert list(obj.keys()) == ["format", "kind", "recitation_key", "chapter_id", "audio", "source",
                                "tool_version", "models", "original_first_start_ms", "ayahs"]
    assert list(obj["audio"].keys()) == ["url", "bytes", "sha256", "measured_duration_ms"]
    assert obj["audio"]["url"] == "https://audio.test/audio/mp3quran/253/002-" + SHA[:16] + ".mp3"
    assert obj["original_first_start_ms"] is None
    assert [p.name for p in out.iterdir()] == ["002.json"]


def test_exit_code_is_one_when_any_surah_is_refused_and_the_others_are_still_written(tmp_path, tanzil, capsys):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    broken = [w for w in simple_words(2, [2, 2, 2]) if w["ayah"] != 3]
    write_inputs(in_dir, {
        1: make_doc(1, simple_words(1, [2, 2]), duration_ms=5000),
        2: make_doc(2, broken, duration_ms=9000),
        3: make_doc(3, simple_words(3, [2, 2]), duration_ms=5000),
    })
    urls = write_urls(tmp_path / "u.json", {"1": "https://x/1.mp3", "2": "https://x/2.mp3", "3": "https://x/3.mp3"})
    code = main(["--kind", "qf", "--recitation-key", "174", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--urls", str(urls)])
    assert code == 1
    assert (out / "001.json").exists() and (out / "003.json").exists()
    assert not (out / "002.json").exists()
    assert "002: missing ayah 3" in capsys.readouterr().err


def test_optional_input_keys_are_ignored(index):
    plain = make_doc(2, simple_words(2, [2, 2, 2]), duration_ms=9000)
    noisy = make_doc(2, [dict(w, confidence=0.1, snapped=True) for w in simple_words(2, [2, 2, 2])],
                     duration_ms=9000)
    noisy.update({"repairs": [{"status": "rejected"}], "manual_marks": [{"ayah": 1}],
                  "basmala_recited": True, "identify": {"score": 0.5}})
    noisy["asr_model"] = {"id": "asr/model", "revision": "rev2", "extra": "dropped"}
    a = convert(plain, 2, index)
    b = convert(noisy, 2, index)
    assert a["ayahs"] == b["ayahs"]
    assert b["models"]["asr"] == {"id": "asr/model", "revision": "rev2"}
    assert a["models"]["asr"] is None


def test_source_is_written_through(tmp_path, tanzil):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    write_inputs(in_dir, {1: make_doc(1, simple_words(1, [2, 2]), duration_ms=5000)})
    urls = write_urls(tmp_path / "u.json", {"1": "https://x/1.mp3"})
    code = main(["--kind", "qf", "--recitation-key", "174", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--urls", str(urls), "--source", "mp3quran_published"])
    assert code == 0
    assert json.loads((out / "001.json").read_text(encoding="utf-8"))["source"] == "mp3quran_published"


def test_a_surah_keeps_its_own_source_over_the_batch_source(tmp_path, tanzil):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    fallback = dict(make_doc(1, simple_words(1, [2, 2]), duration_ms=5000), source="aligner")
    write_inputs(in_dir, {1: fallback})
    urls = write_urls(tmp_path / "u.json", {"1": "https://x/1.mp3"})
    code = main(["--kind", "qf", "--recitation-key", "174", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--urls", str(urls), "--source", "mp3quran_published"])
    assert code == 0
    assert json.loads((out / "001.json").read_text(encoding="utf-8"))["source"] == "aligner"


def test_an_unknown_surah_source_is_refused(tmp_path, tanzil):
    in_dir, out = tmp_path / "in", tmp_path / "out"
    write_inputs(in_dir, {1: dict(make_doc(1, simple_words(1, [2, 2]), duration_ms=5000), source="guess")})
    urls = write_urls(tmp_path / "u.json", {"1": "https://x/1.mp3"})
    code = main(["--kind", "qf", "--recitation-key", "174", "--in", str(in_dir), "--out", str(out),
                 "--tanzil", str(tanzil), "--urls", str(urls)])
    assert code != 0
    assert not (out / "001.json").exists()
