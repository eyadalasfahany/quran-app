"""LOCAL-ONLY pilot: put a Taybah timing file into the local `quran` MySQL so the app can play it.
Not repo code. Prints SQL to stdout.
Usage: python3 scripts/local_import.py OUT.json "<verse_id:qf_word_count ...>" FIRST_VERSE_ID > import.sql
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]  # scripts -> recitation-align -> tools -> repo
MANIFEST = REPO / "apps" / "api" / "resources" / "mp3quran" / "manifest.json"

d = json.load(open(sys.argv[1], encoding="utf-8"))
qf = dict(tuple(map(int, p.split(":"))) for p in sys.argv[2].split())  # verse_id -> QF word count
FIRST_VERSE_ID = int(sys.argv[3])
SURAH, MOSHAF = d["surah"], 253
FILE_ID = 1_000_000_000 + MOSHAF * 1000 + SURAH
URL = next(f["url"] for f in json.load(open(MANIFEST, encoding="utf-8"))["moshafs"][0]["files"] if f["surah"] == SURAH)
dur = d["audio"]["duration_ms"]

by_ayah = {}
for w in d["words"]:
    if not w["basmala"]:
        by_ayah.setdefault(w["ayah"], []).append(w)

def qf_words(ws):
    """Merge a standalone vocative «يا» into the next token (QF writes يَٰٓأَيُّهَا as one word)."""
    out, i = [], 0
    while i < len(ws):
        w = ws[i]
        if w["word"].replace("َ", "") in ("يا",) and i + 1 < len(ws):
            out.append((w["start_ms"], ws[i + 1]["end_ms"])); i += 2
        else:
            out.append((w["start_ms"], w["end_ms"])); i += 1
    return out

ayahs = sorted(by_ayah)
rows, mismatches = [], []
for idx, a in enumerate(ayahs):
    words = qf_words(by_ayah[a])
    start = 0 if a == 1 else by_ayah[a][0]["start_ms"]
    end = by_ayah[ayahs[idx + 1]][0]["start_ms"] if idx + 1 < len(ayahs) else dur
    vid = FIRST_VERSE_ID + a - 1
    if len(words) == qf[vid]:
        seg = json.dumps([[i + 1, s, e] for i, (s, e) in enumerate(words)])
    else:
        seg = None
        mismatches.append(f"{SURAH}:{a} ours={len(words)} qf={qf[vid]}")
    rows.append((vid, f"{SURAH}:{a}", start, end, seg))

print(f"-- word-count mismatches (ayah highlight only): {mismatches or 'none'}", file=sys.stderr)

q = lambda s: "NULL" if s is None else "'" + s.replace("'", "''") + "'"
print(f"""
START TRANSACTION;
INSERT INTO content_sources (code,name,licence_url,attribution_ar,attribution_en,permission_status,notes,created_at,updated_at)
VALUES ('mp3quran','MP3Quran','https://www.mp3quran.net','التلاوات من موقع MP3Quran','Recitations from MP3Quran','granted','LOCAL PILOT (ADR 0061 proposed)',NOW(6),NOW(6))
ON DUPLICATE KEY UPDATE updated_at=NOW(6);
SET @src := (SELECT id FROM content_sources WHERE code='mp3quran');
INSERT INTO resources (source_id,`group`,source_key,name,name_ar,version,changes_floor_version,is_active,synced_at,created_at,updated_at)
VALUES (@src,'chapter_recitations','{MOSHAF}','Islam Sobhi','إسلام صبحي',1,1,1,NOW(6),NOW(6),NOW(6))
ON DUPLICATE KEY UPDATE version=version+1, changes_floor_version=version, updated_at=NOW(6);
SET @res := (SELECT id FROM resources WHERE source_id=@src AND `group`='chapter_recitations' AND source_key='{MOSHAF}');
INSERT INTO recitations (resource_id,reciter_name,reciter_name_ar,style,qirat,has_word_segments)
VALUES (@res,'Islam Sobhi','إسلام صبحي','Murattal','Hafs',1)
ON DUPLICATE KEY UPDATE has_word_segments=1;
SET @rec := (SELECT id FROM recitations WHERE resource_id=@res);
DELETE FROM chapter_audio_files WHERE id={FILE_ID};
INSERT INTO chapter_audio_files (id,recitation_id,chapter_id,audio_url,size_bytes,duration_ms,format)
VALUES ({FILE_ID},@rec,{SURAH},'{URL}',{d['audio']['bytes']},{dur},'mp3');
INSERT INTO recitation_timings (audio_file_id,verse_id,verse_key,start_ms,end_ms,segments) VALUES
""" + ",\n".join(f"({FILE_ID},{v},'{k}',{s},{e},{q(g)})" for v, k, s, e, g in rows) + """;
COMMIT;
SELECT @res AS resource_id;""")
