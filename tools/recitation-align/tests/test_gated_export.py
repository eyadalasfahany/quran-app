"""Gated export (plan way2quran-quality Q6b). Placeholder text only; no model, no network."""

import json

from recitation_align import export, gated_export
from test_export import SHA, TANZIL_LINES, make_doc, simple_words, write_inputs, write_manifest
from test_report import gate as make_gate

KEY = "253"
REASONS = {"no_highlight": ["needs-repair"], "unavailable": ["incomplete-middle"]}


def setup(tmp_path, verdicts, *, nulls=None, aligned=None):
    """Surah 2 has three ayahs. `verdicts` maps surah -> gate verdict; `aligned` lists surahs that get a document."""
    (tmp_path / "tanzil.txt").write_text("\n".join(TANZIL_LINES) + "\n", encoding="utf-8")
    manifest = {"moshafs": [{"moshaf_id": 253, "files": []}]}
    docs, gates = {}, tmp_path / "gate"
    gates.mkdir()
    for surah, verdict in verdicts.items():
        per = [2, 2, 2] if surah == 2 else [2, 2]
        docs[surah] = make_doc(surah, simple_words(surah, per), duration_ms=9000)
        manifest["moshafs"][0]["files"].append({
            "surah": surah, "sha256": SHA, "bytes": 1234,
            "url": f"https://audio.test/audio/way2quran/253/{surah:03d}-{SHA[:16]}.mp3"})
        record = make_gate(surah, verdict, segments_null=(nulls or {}).get(surah, ()),
                           reasons=REASONS.get(verdict, ()), stored=False)
        record["sha256"] = SHA
        (gates / f"{surah:03d}.json").write_text(json.dumps(record), encoding="utf-8")
    if aligned is not None:
        docs = {s: d for s, d in docs.items() if s in aligned}
    write_inputs(tmp_path / "aligned", docs)
    (tmp_path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return tmp_path


def run(base, out, *, extra=()):
    return gated_export.main([
        "--kind", "way2quran", "--recitation-key", KEY, "--in", str(base / "aligned"),
        "--gate-dir", str(base / "gate"), "--out", str(out), "--manifest", str(base / "manifest.json"),
        "--tanzil", str(base / "tanzil.txt"), *extra])


def test_without_nulls_the_files_are_byte_identical_to_export_main(tmp_path):
    base = setup(tmp_path, {1: "pass", 2: "repaired"})
    assert run(base, tmp_path / "gated") == 0
    assert export.main(["--kind", "way2quran", "--recitation-key", KEY, "--in", str(base / "aligned"),
                        "--out", str(tmp_path / "plain"), "--manifest", str(base / "manifest.json"),
                        "--tanzil", str(base / "tanzil.txt")]) == 0
    names = sorted(p.name for p in (tmp_path / "plain").iterdir())
    assert names == ["001.json", "002.json"]
    assert sorted(p.name for p in (tmp_path / "gated").iterdir()) == names
    for name in names:
        assert (tmp_path / "gated" / name).read_bytes() == (tmp_path / "plain" / name).read_bytes()


def test_a_segments_null_ayah_is_written_as_null(tmp_path):
    base = setup(tmp_path, {2: "pass"}, nulls={2: [2]})
    assert run(base, tmp_path / "gated") == 0
    plain = tmp_path / "plain"
    export.main(["--kind", "way2quran", "--recitation-key", KEY, "--in", str(base / "aligned"), "--out", str(plain),
                 "--manifest", str(base / "manifest.json"), "--tanzil", str(base / "tanzil.txt")])
    got = json.loads((tmp_path / "gated" / "002.json").read_text(encoding="utf-8"))
    want = json.loads((plain / "002.json").read_text(encoding="utf-8"))
    assert got["ayahs"][1]["segments"] is None
    assert got["ayahs"][0]["segments"] == want["ayahs"][0]["segments"] is not None
    assert got["ayahs"][2]["segments"] == want["ayahs"][2]["segments"]
    want["ayahs"][1]["segments"] = None
    assert got == want
    assert b'"segments":null' in (tmp_path / "gated" / "002.json").read_bytes()


def test_no_highlight_and_unavailable_surahs_get_no_file(tmp_path):
    base = setup(tmp_path, {1: "no_highlight", 2: "pass", 3: "unavailable"})
    assert run(base, tmp_path / "gated") == 0
    assert [p.name for p in (tmp_path / "gated").iterdir()] == ["002.json"]


def test_nothing_is_written_when_no_surah_ships(tmp_path):
    base = setup(tmp_path, {1: "no_highlight"})
    assert run(base, tmp_path / "gated") == 0
    assert not (tmp_path / "gated").exists()


def test_a_pass_without_an_aligned_document_is_refused(tmp_path, capsys):
    base = setup(tmp_path, {1: "pass", 2: "pass"}, aligned=[1])
    assert run(base, tmp_path / "gated") == 1
    assert "002: gate verdict pass but no aligned document" in capsys.readouterr().err
    assert [p.name for p in (tmp_path / "gated").iterdir()] == ["001.json"]


def test_an_aligned_document_without_a_gate_record_is_refused(tmp_path, capsys):
    base = setup(tmp_path, {1: "pass", 2: "pass"})
    (base / "gate" / "002.json").unlink()
    assert run(base, tmp_path / "gated") == 1
    assert "002: aligned document has no gate record" in capsys.readouterr().err
    assert [p.name for p in (tmp_path / "gated").iterdir()] == ["001.json"]


def test_a_document_of_another_file_is_refused(tmp_path, capsys):
    base = setup(tmp_path, {1: "pass"})
    record = json.loads((base / "gate" / "001.json").read_text(encoding="utf-8"))
    record["sha256"] = "ab" * 32
    (base / "gate" / "001.json").write_text(json.dumps(record), encoding="utf-8")
    assert run(base, tmp_path / "gated") == 1
    assert "audio sha256 differs from the gate record" in capsys.readouterr().err
    assert not (tmp_path / "gated").exists()


def test_a_segments_null_ayah_the_surah_lacks_is_refused(tmp_path, capsys):
    base = setup(tmp_path, {1: "pass"}, nulls={1: [9]})
    assert run(base, tmp_path / "gated") == 1
    assert "segments_null lists ayah 9" in capsys.readouterr().err
