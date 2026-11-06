"""Tests for the add-reciter CI helpers. Offline: a fake MP3Quran API, placeholder text, no torch."""

import importlib.util
import json
from pathlib import Path

import pytest

from recitation_align import ci
from recitation_align.ci import CiError

REPO = Path(__file__).resolve().parents[3]
REAL_MANIFEST = REPO / "apps/api/resources/mp3quran/manifest.json"
REAL_PHP = REPO / "apps/api/config/quran.php"
SERVER = "https://cdn.example.test/audio/fixture-reciter/r1/"


class FakeApi:
    def __init__(self, reciters, reads, rows=None):
        self.reciters = reciters
        self.reads = reads
        self.rows = rows or {}
        self.calls = []

    def get_json(self, path, **params):
        self.calls.append((path, params))
        if path == "reciters":
            return {"reciters": self.reciters}
        if path == "ayat_timing/reads":
            return self.reads
        if path == "ayat_timing":
            return self.rows[(int(params["surah"]), int(params["read"]))]
        raise AssertionError(path)


def reciters_fixture():
    return [
        {"id": 7, "name": "قارئ تجريبي", "moshaf": [
            {"id": 86, "rewaya_id": 1, "server": SERVER, "surah_list": "1,2,3,4,5", "name": "x"},
            {"id": 87, "rewaya_id": 2, "server": "https://cdn.example.test/audio/other/r2/", "surah_list": "1", "name": "y"},
            {"id": 88, "rewaya_id": 1, "server": "https://cdn.example.test/audio/noread/r1/", "surah_list": "1", "name": "z"},
            {"id": 253, "rewaya_id": 1, "server": "https://cdn.example.test/audio/held/r1/", "surah_list": "1", "name": "h"},
            {"id": 50, "rewaya_id": 1, "server": "https://cdn.example.test/audio/dup/r1/", "surah_list": "1", "name": "d"},
        ]},
    ]


def reads_fixture():
    return [
        {"id": 9, "folder_url": SERVER.rstrip("/"), "soar_count": 3},
        {"id": 10, "folder_url": "https://cdn.example.test/audio/held/r1", "soar_count": 1},
        {"id": 11, "folder_url": "https://cdn.example.test/audio/dup/r1/", "soar_count": 1},
    ]


PHP = """<?php return [
    'mp3quran_duplicates' => [50 => 7],
    'mp3quran_held_moshafs' => [253],
    'mp3quran_riwayat' => ['حفص عن عاصم'],
];"""


@pytest.fixture
def tanzil(tmp_path):
    lines = []
    lengths = {1: [10, 10], 2: [30], 3: [5, 5, 5], 4: [100], 5: [20, 20]}
    for surah, sizes in lengths.items():
        for n, size in enumerate(sizes, start=1):
            lines.append(f"{surah}|{n}|{'x' * size}")
    path = tmp_path / "tanzil.txt"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def fake(reads=None, reciters=None, rows=None):
    return FakeApi(reciters or reciters_fixture(), reads if reads is not None else reads_fixture(), rows)


# parsing

def test_moshaf_ids_accept_spaces_and_reject_junk():
    assert ci.parse_moshaf_ids(" 253, 86 ") == [253, 86]
    for bad in ["", "a", "86,", "86;87", "-1", "86,86"]:
        with pytest.raises(CiError):
            ci.parse_moshaf_ids(bad)


def test_chunks_bounds():
    assert ci.parse_chunks("6") == 6
    for bad in ["0", "21", "x", ""]:
        with pytest.raises(CiError):
            ci.parse_chunks(bad)


def test_php_keys_from_fixture_and_real_config():
    assert ci.php_array_keys(PHP, "mp3quran_duplicates") == [50]
    assert ci.php_array_keys(PHP, "mp3quran_held_moshafs") == [253]
    real = REAL_PHP.read_text(encoding="utf-8")
    assert ci.php_array_keys(real, "mp3quran_held_moshafs") == [253]
    assert ci.php_array_keys(real, "mp3quran_duplicates") == []


def test_php_unreadable_array_is_refused():
    with pytest.raises(CiError):
        ci.php_array_keys("'mp3quran_duplicates' => [fn() => 1],", "mp3quran_duplicates")
    with pytest.raises(CiError):
        ci.php_array_keys("nothing here", "mp3quran_duplicates")


def test_surah_list_must_be_surah_numbers():
    assert ci.parse_surah_list("3,1,2") == [1, 2, 3]
    with pytest.raises(CiError):
        ci.parse_surah_list("1,115")


# chunking

def test_chunks_are_near_equal_sorted_and_deterministic(tanzil):
    weights = ci.surah_weights(tanzil)
    first = ci.chunk_surahs([1, 2, 3, 4, 5], weights, 2)
    assert first == ci.chunk_surahs([5, 4, 3, 2, 1], weights, 2)
    assert sorted(s for group in first for s in group) == [1, 2, 3, 4, 5]
    assert all(group == sorted(group) for group in first)
    assert len(first) == 2


def test_more_chunks_than_surahs_gives_one_surah_each(tanzil):
    groups = ci.chunk_surahs([1, 2], ci.surah_weights(tanzil), 6)
    assert sorted(groups) == [[1], [2]]


# plan

def test_plan_emits_chunks_and_moshaf_list(tanzil):
    api = fake()
    result = ci.plan(api, [86], 2, manifest=None, php_source=PHP, tanzil_path=tanzil)
    assert result["moshafs"] == [86]
    assert [e["chunk"] for e in result["chunks"]] == [1, 2]
    assert sorted(s for e in result["chunks"] for s in e["surahs"]) == [1, 2, 3, 4, 5]
    assert set(result["chunks"][0]) == {"moshaf", "chunk", "surahs"}


@pytest.mark.parametrize("moshaf, text", [
    (87, "not Hafs"),
    (253, "held"),
    (50, "mp3quran_duplicates"),
    (88, "no published timings"),
    (999, "not in the MP3Quran reciters list"),
])
def test_plan_refuses(tanzil, moshaf, text):
    with pytest.raises(CiError, match=text):
        ci.plan(fake(), [moshaf], 2, manifest=None, php_source=PHP, tanzil_path=tanzil)


def test_plan_refuses_a_complete_committed_moshaf(tanzil):
    manifest = {"moshafs": [{"moshaf_id": 86, "files": [{"surah": s} for s in range(1, 6)]}]}
    with pytest.raises(CiError, match="already in the committed manifest"):
        ci.plan(fake(), [86], 2, manifest=manifest, php_source=PHP, tanzil_path=tanzil)


def test_plan_allows_a_partial_committed_moshaf(tanzil):
    manifest = {"moshafs": [{"moshaf_id": 86, "files": [{"surah": 1}]}]}
    result = ci.plan(fake(), [86], 1, manifest=manifest, php_source=PHP, tanzil_path=tanzil)
    assert result["chunks"][0]["surahs"] == [1, 2, 3, 4, 5]


def test_plan_collects_every_refusal(tanzil):
    with pytest.raises(CiError) as err:
        ci.plan(fake(), [87, 253], 2, manifest=None, php_source=PHP, tanzil_path=tanzil)
    assert "not Hafs" in str(err.value) and "held" in str(err.value)


def test_find_read_refuses_ambiguous_folder():
    reads = [{"id": 1, "folder_url": SERVER}, {"id": 2, "folder_url": SERVER.rstrip("/")}]
    with pytest.raises(CiError, match="several"):
        ci.find_read(fake(reads=reads), SERVER)


# fetch

def test_fetch_writes_unpadded_raw_files(tmp_path):
    rows = [{"ayah": 1, "start_time": 0, "end_time": 5, "polygon": "p", "page": "1", "x": "1", "y": "2"}]
    api = fake(rows={(1, 9): rows, (3, 9): rows})
    out = tmp_path / "published" / "86"
    written = ci.fetch_published(api, 86, [3, 1], out)
    assert [p.name for p in written] == ["raw-1.json", "raw-3.json"]
    assert json.loads((out / "raw-3.json").read_text(encoding="utf-8")) == rows
    assert ("ayat_timing", {"surah": "1", "read": "9"}) in api.calls


def test_fetch_refuses_empty_or_surah_outside_list(tmp_path):
    api = fake(rows={(1, 9): []})
    with pytest.raises(CiError, match="no published rows"):
        ci.fetch_published(api, 86, [1], tmp_path)
    with pytest.raises(CiError, match="not in moshaf"):
        ci.fetch_published(api, 86, [9], tmp_path)


# merge

def part(moshaf, files, *, surah_list="1,2,3", public_base="https://audio.example.test", generated="2026-11-05T10:00:00Z",
         name="قارئ تجريبي"):
    return {
        "schema": 1, "source": "mp3quran", "generated_at": generated, "public_base": public_base,
        "moshafs": [{"moshaf_id": moshaf, "reciter_id": 7, "name_ar": name, "name_en": "Fixture",
                     "riwayah": "حفص عن عاصم", "moshaf_name": "x", "server": SERVER,
                     "surah_list": [int(s) for s in surah_list.split(",")],
                     "files": [file_entry(moshaf, s) for s in files]}],
    }


def file_entry(moshaf, surah):
    return {"surah": surah, "key": f"audio/mp3quran/{moshaf}/{surah:03d}-aaaaaaaaaaaaaaaa.mp3",
            "url": f"https://audio.example.test/audio/mp3quran/{moshaf}/{surah:03d}-aaaaaaaaaaaaaaaa.mp3",
            "bytes": 10, "sha256": "a" * 64, "duration_ms": 1000, "source_url": "https://x/y.mp3",
            "source_etag": '"e"'}


def other_moshaf_record(moshaf=253):
    return {"moshaf_id": moshaf, "reciter_id": 1, "name_ar": "آخر", "name_en": "Other", "riwayah": "r",
            "moshaf_name": "m", "server": "https://x/", "surah_list": [1],
            "files": [file_entry(moshaf, 1)]}


def committed_with(other_first_id=253):
    return {"schema": 1, "source": "mp3quran", "generated_at": "2026-11-01T00:00:00Z",
            "public_base": "https://audio.example.test",
            "moshafs": [other_moshaf_record(other_first_id)]}


def test_merge_is_deterministic_and_order_independent():
    a = part(86, [1, 2])
    b = part(86, [3])
    committed = committed_with()
    one = ci.encode_manifest(ci.merge_manifest(committed, [a, b], 86))
    two = ci.encode_manifest(ci.merge_manifest(committed, [b, a], 86))
    assert one == two


def test_merge_leaves_other_moshafs_byte_identical():
    committed = committed_with(253)
    before = ci.encode_manifest(committed)
    merged = ci.merge_manifest(committed, [part(86, [1, 2, 3])], 86)
    other_before = [r for r in json.loads(before)["moshafs"] if r["moshaf_id"] == 253]
    other_after = [r for r in merged["moshafs"] if r["moshaf_id"] == 253]
    assert ci.encode_manifest({"moshafs": other_before}) == ci.encode_manifest({"moshafs": other_after})
    assert [r["moshaf_id"] for r in merged["moshafs"]] == [86, 253]


def test_merge_refuses_a_missing_surah():
    with pytest.raises(CiError, match="missing surah"):
        ci.merge_manifest(None, [part(86, [1, 2])], 86)


def test_merge_refuses_duplicate_and_foreign_surahs():
    with pytest.raises(CiError, match="two parts"):
        ci.merge_manifest(None, [part(86, [1, 2, 3]), part(86, [3])], 86)
    with pytest.raises(CiError, match="not in moshaf"):
        ci.merge_manifest(None, [part(86, [1, 2, 3, 4])], 86)


def test_merge_refuses_metadata_or_base_disagreement_and_foreign_moshaf():
    with pytest.raises(CiError, match="metadata differs"):
        ci.merge_manifest(None, [part(86, [1, 2]), part(86, [3], name="اسم آخر")], 86)
    with pytest.raises(CiError, match="public_base"):
        ci.merge_manifest(None, [part(86, [1, 2]), part(86, [3], public_base="https://other.example")], 86)
    with pytest.raises(CiError, match="holds moshaf"):
        ci.merge_manifest(None, [part(86, [1, 2, 3]), part(253, [1])], 86)
    with pytest.raises(CiError, match="public_base differs"):
        ci.merge_manifest({"public_base": "https://elsewhere", "moshafs": []}, [part(86, [1, 2, 3])], 86)


def test_merge_noop_keeps_generated_at():
    committed = ci.merge_manifest(committed_with(), [part(86, [1, 2, 3], generated="2026-11-05T10:00:00Z")], 86)
    again = ci.merge_manifest(committed, [part(86, [1, 2, 3], generated="2026-11-06T10:00:00Z")], 86)
    assert again["generated_at"] == committed["generated_at"]


def test_committed_manifest_round_trips_byte_for_byte():
    text = REAL_MANIFEST.read_text(encoding="utf-8")
    assert ci.encode_manifest(json.loads(text)) == text


def test_merge_replaces_stale_record_wholesale():
    stale = committed_with(86)
    stale["moshafs"][0]["files"].append(file_entry(86, 99))
    merged = ci.merge_manifest(stale, [part(86, [1, 2, 3])], 86)
    assert [f["surah"] for f in merged["moshafs"][0]["files"]] == [1, 2, 3]


# aligned and quality

def test_check_aligned_refuses_missing_and_extra(tmp_path):
    for s in (1, 2):
        (tmp_path / f"{s:03d}.json").write_text("{}", encoding="utf-8")
    ci.check_aligned(tmp_path, [1, 2])
    with pytest.raises(CiError, match="missing"):
        ci.check_aligned(tmp_path, [1, 2, 3])
    with pytest.raises(CiError, match="not in the reciter"):
        ci.check_aligned(tmp_path, [1])


def test_quality_summary_counts_without_text(tmp_path):
    doc = {
        "source": "aligner",
        "ayahs": [{"ayah": 1}, {"ayah": 2}],
        "words": [
            {"ayah": 1, "basmala": True, "confidence": 0.1},
            {"ayah": 1, "confidence": 0.9},
            {"ayah": 2, "confidence": 0.2},
            {"ayah": 2, "confidence": 0.3},
        ],
    }
    (tmp_path / "001.json").write_text(json.dumps(doc), encoding="utf-8")
    text = ci.quality_summary(tmp_path, [1])
    assert "| 1 | aligner | 2 | 4 | 0.250 | 1 (2) |" in text
    assert "Ayahs below 0.4: 1." in text


# script entry point (fake API via monkeypatch)

def load_script(name):
    path = Path(__file__).resolve().parents[1] / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_ci_plan_script_writes_github_output(tmp_path, tanzil, monkeypatch):
    monkeypatch.setattr(ci, "Api", lambda: fake())
    php = tmp_path / "quran.php"
    php.write_text(PHP, encoding="utf-8")
    output = tmp_path / "out.txt"
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    script = load_script("ci_plan")
    code = script.main(["--moshafs", "86", "--chunks", "2", "--manifest", str(tmp_path / "none.json"),
                        "--php", str(php), "--tanzil", str(tanzil)])
    assert code == 0
    lines = dict(line.split("=", 1) for line in output.read_text(encoding="utf-8").splitlines())
    assert json.loads(lines["moshafs"]) == [86]
    assert len(json.loads(lines["chunks"])) == 2


def test_ci_plan_script_refusal_exits_non_zero(tmp_path, tanzil, monkeypatch, capsys):
    monkeypatch.setattr(ci, "Api", lambda: fake())
    php = tmp_path / "quran.php"
    php.write_text(PHP, encoding="utf-8")
    script = load_script("ci_plan")
    code = script.main(["--moshafs", "253", "--php", str(php), "--tanzil", str(tanzil),
                        "--manifest", str(tmp_path / "none.json")])
    assert code == 1
    assert "held" in capsys.readouterr().err


def test_parse_done_artifacts_ignores_blanks_and_refuses_other_names():
    assert ci.parse_done_artifacts("align-12-2, align-12-3,,") == {"align-12-2", "align-12-3"}
    assert ci.parse_done_artifacts("") == set()
    with pytest.raises(CiError, match="unexpected artifact"):
        ci.parse_done_artifacts("align-12-2,secrets")


def test_drop_done_chunks_keeps_only_the_missing_ones():
    entries = [{"moshaf": 12, "chunk": c, "surahs": [c]} for c in (1, 2, 3)]
    entries.append({"moshaf": 62, "chunk": 1, "surahs": [1]})
    kept = ci.drop_done_chunks(entries, {"align-12-2", "align-12-3", "align-62-1"})
    assert kept == [{"moshaf": 12, "chunk": 1, "surahs": [1]}]
