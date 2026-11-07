"""workflow_dump.py: the T4 comparison and the B5 guard scan, on small inline workflows (plan step Q0)."""

import copy
import importlib.util
from pathlib import Path

import pytest

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("workflow_dump", TOOL / "scripts" / "workflow_dump.py")
wd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wd)

BASE = """
name: x
on:
  workflow_dispatch:
    inputs:
      source: {required: true, default: mp3quran, type: string}
      chunks: {required: false, default: "6", description: old, type: string}
jobs:
  plan:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Validate inputs and plan
        id: plan
        env:
          SOURCE: ${{ inputs.source }}
        run: echo plan
  align:
    needs: plan
    if: ${{ needs.plan.result == 'success' }}
    runs-on: ubuntu-latest
    timeout-minutes: 300
    steps:
      - name: Ingest
        if: ${{ inputs.source == 'mp3quran' }}
        run: echo mp3quran
      - name: Ingest other
        if: ${{ inputs.source == 'way2quran' }}
        run: echo way2quran
      - name: Test
        run: echo test
"""


def doc(text=BASE):
    return wd.parse(text)


def edited(fn):
    d = copy.deepcopy(doc())
    fn(d)
    return d


def test_identical_workflows_have_no_differences():
    assert wd.compare(doc(), doc()) == ([], [])


def test_allowed_changes_are_reported_but_not_failures():
    def change(d):
        inputs = d[True]["workflow_dispatch"]["inputs"]
        inputs["chunks"].update(default="", description="new")
        inputs["quality"] = {"type": "boolean"}
        inputs["calibrate"] = {"type": "boolean"}
        d["jobs"]["plan"]["steps"][0]["env"].update(QUALITY="x", CALIBRATE="y")
        d["jobs"]["align"]["steps"][1]["run"] = "echo changed way2quran step"
        d["jobs"]["align"]["steps"].append({"name": "New", "if": "${{ inputs.source == 'way2quran' }}", "run": "x"})

    bad, allowed = wd.compare(doc(), edited(change))
    assert bad == []
    assert len(allowed) == 6


@pytest.mark.parametrize("change", [
    lambda d: d["jobs"]["align"].update(timeout_minutes=1) or d["jobs"]["align"].update({"timeout-minutes": 1}),
    lambda d: d["jobs"]["align"].update({"if": "${{ true }}"}),
    lambda d: d["jobs"]["align"].update({"needs": []}),
    lambda d: d["jobs"]["align"]["steps"][0].update(run="echo other"),
    lambda d: d["jobs"]["align"]["steps"][2].update(run="echo other"),
    lambda d: d["jobs"]["align"]["steps"].pop(0),
    lambda d: d["jobs"]["align"]["steps"].append({"name": "Extra", "run": "x"}),
    lambda d: d["jobs"]["plan"]["steps"][0]["env"].update(OTHER="x"),
    lambda d: d[True]["workflow_dispatch"]["inputs"]["source"].update(default="way2quran"),
    lambda d: d[True]["workflow_dispatch"]["inputs"].update(extra={"type": "string"}),
    lambda d: d["jobs"].pop("align"),
])
def test_any_other_change_fails(change):
    bad, _ = wd.compare(doc(), edited(change))
    assert bad


def test_a_step_that_becomes_way2quran_guarded_fails():
    def change(d):
        d["jobs"]["align"]["steps"][2]["if"] = "${{ inputs.source == 'way2quran' }}"

    bad, _ = wd.compare(doc(), edited(change))
    assert any("Test" in line for line in bad)


def test_guards_pass_when_markers_sit_in_way2quran_steps():
    def change(d):
        d["jobs"]["align"]["steps"][1]["run"] = "tool --quality --calibrate hf-asr-x w2q_y way2quran-exclude"

    assert wd.guard_violations(edited(change)) == []


@pytest.mark.parametrize("marker", wd.MARKERS)
def test_guards_flag_a_marker_in_an_unguarded_or_mp3quran_step(marker):
    for index in (0, 2):
        def change(d):
            d["jobs"]["align"]["steps"][index]["run"] = f"tool {marker}"

        assert len(wd.guard_violations(edited(change))) == 1


def test_the_committed_workflow_is_identical_to_itself_and_passes_the_guards():
    committed = doc((wd.REPO / wd.WORKFLOW).read_text(encoding="utf-8"))
    assert wd.compare(committed, committed) == ([], [])
    assert wd.guard_violations(committed) == []
