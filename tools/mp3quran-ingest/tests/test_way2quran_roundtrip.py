"""The committed Way2Quran reciter data file re-serialises byte for byte (plan step Q0, a baseline).

Names and ids are read from the committed file at test time; nothing is copied into this test.
"""

import json

from mp3quran_ingest.way2quran import DEFAULT_WAY2QURAN_DATA, parse_document, to_document


def test_committed_reciter_file_round_trips_byte_for_byte():
    original = DEFAULT_WAY2QURAN_DATA.read_bytes()
    reciters = parse_document(json.loads(original.decode("utf-8")))
    again = json.dumps(to_document(reciters), ensure_ascii=False, indent=2).encode("utf-8") + b"\n"
    assert again == original
