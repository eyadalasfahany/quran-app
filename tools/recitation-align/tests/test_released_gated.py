"""The release guard on the real repository (plan way2quran-quality Q9, P18).

Reads the released ids from `apps/api/config/quran.php` and runs the guard for each. With no released ids it
passes. It never skips, needs no model and no network, and compares against RELEASE_BASE_REF (default HEAD).
"""

import os

from recitation_align import ci, release_guard

BASE_REF = os.environ.get("RELEASE_BASE_REF") or "HEAD"


def released_ids() -> list[int]:
    text = (release_guard.REPO_ROOT / release_guard.QURAN_CONFIG).read_text(encoding="utf-8")
    return ci.php_array_keys(text, release_guard.RELEASED_KEY)


def test_released_reciters_pass_the_guard():
    problems = {rid: release_guard.check_reciter(release_guard.REPO_ROOT, rid, BASE_REF) for rid in released_ids()}
    assert {rid: p for rid, p in problems.items() if p} == {}


def test_the_released_list_is_readable():
    assert isinstance(released_ids(), list)
