"""The add-reciter workflow rule (plan way2quran-quality, T4 and B5). Standard library plus PyYAML.

    uv run python scripts/workflow_dump.py --check <base-ref>
    uv run python scripts/workflow_dump.py --guards

`--check REF` compares `.github/workflows/add-reciter.yml` at git ref REF with the file in the working
tree. It compares, between the two: every job's `needs`, `if`, `strategy`, `timeout-minutes`, `permissions`,
`environment` and `runs-on`; every step that is unguarded or not guarded by `inputs.source == 'way2quran'`
(so: unguarded steps, steps guarded by `inputs.source == 'mp3quran'`, and steps with any other condition),
with all their keys; and the dispatch inputs. The only allowed differences:

- P16: the `plan` step of the `plan` job may gain the env keys `QUALITY` and `CALIBRATE`;
- P2: the `chunks` input's `default` and `description`;
- the new inputs `quality` and `calibrate`.

It prints `identical` (or `identical except the allowed differences`) and exits 0, or lists every other
difference and exits 1.

`--guards` (B5) checks that each of the Way2Quran-only markers `--quality`, `--calibrate`, `hf-asr-`,
`w2q_` and `way2quran-exclude` appears only inside a step whose `if` contains `inputs.source == 'way2quran'`.
It exits 1 and names every occurrence that is not.

PyYAML is installed by `transformers`, so `uv run` has it. Without it the script exits with a message.
"""

import argparse
import copy
import json
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - exercised only on a bare interpreter
    sys.exit("workflow_dump.py needs PyYAML (installed with transformers): run it through `uv run`")

REPO = Path(__file__).resolve().parents[3]
WORKFLOW = ".github/workflows/add-reciter.yml"
JOB_KEYS = ("needs", "if", "strategy", "timeout-minutes", "permissions", "environment", "runs-on")
W2Q_GUARD = "inputs.source == 'way2quran'"
MARKERS = ("--quality", "--calibrate", "hf-asr-", "w2q_", "way2quran-exclude")
ALLOWED_INPUTS_ADDED = ("quality", "calibrate")
ALLOWED_INPUT_KEYS_CHANGED = {"chunks": ("default", "description")}
ALLOWED_PLAN_ENV_ADDED = ("QUALITY", "CALIBRATE")
PLAN_JOB = "plan"
PLAN_STEP = "Validate inputs and plan"


def parse(text: str) -> dict:
    doc = yaml.safe_load(text)
    if not isinstance(doc, dict):
        raise SystemExit("the workflow is not a YAML mapping")
    return doc


def triggers(doc: dict) -> dict:
    """The `on:` block. YAML 1.1 reads the bare key `on` as the boolean True."""
    return doc.get("on", doc.get(True)) or {}


def dispatch_inputs(doc: dict) -> dict:
    return (triggers(doc).get("workflow_dispatch") or {}).get("inputs") or {}


def guarded_for_way2quran(step: dict) -> bool:
    return W2Q_GUARD in str(step.get("if", ""))


def relevant_steps(job: dict) -> list[dict]:
    return [s for s in job.get("steps", []) if not guarded_for_way2quran(s)]


def step_label(step: dict, index: int) -> str:
    return step.get("name") or step.get("id") or f"step {index + 1}"


def dump(doc: dict) -> dict:
    """The compared view of a workflow."""
    jobs = {}
    for name, job in (doc.get("jobs") or {}).items():
        view = {key: job[key] for key in JOB_KEYS if key in job}
        view["steps"] = {}
        for index, step in enumerate(relevant_steps(job)):
            view["steps"][f"{index:03d} {step_label(step, index)}"] = step
        jobs[name] = view
    return {"inputs": dispatch_inputs(doc), "jobs": jobs}


def same(a, b) -> bool:
    return json.dumps(a, sort_keys=True, default=str) == json.dumps(b, sort_keys=True, default=str)


def compare(base_doc: dict, head_doc: dict) -> tuple[list[str], list[str]]:
    """(differences, allowed differences) between two parsed workflows."""
    bad: list[str] = []
    allowed: list[str] = []

    base_in, head_in = copy.deepcopy(dispatch_inputs(base_doc)), copy.deepcopy(dispatch_inputs(head_doc))
    for name in ALLOWED_INPUTS_ADDED:
        if name in head_in and name not in base_in:
            allowed.append(f"input {name} added")
            del head_in[name]
    for name, keys in ALLOWED_INPUT_KEYS_CHANGED.items():
        if name in base_in and name in head_in:
            for key in keys:
                if base_in[name].get(key) != head_in[name].get(key):
                    allowed.append(f"input {name}: {key} changed")
                base_in[name].pop(key, None)
                head_in[name].pop(key, None)
    for name in sorted(set(base_in) | set(head_in)):
        if not same(base_in.get(name), head_in.get(name)):
            bad.append(f"input {name}: differs")
    other_base = {k: v for k, v in triggers(base_doc).items() if k != "workflow_dispatch"}
    other_head = {k: v for k, v in triggers(head_doc).items() if k != "workflow_dispatch"}
    if not same(other_base, other_head):
        bad.append("on: triggers other than workflow_dispatch differ")

    base, head = dump(base_doc), dump(copy.deepcopy(head_doc))
    # P16: the plan step may gain the QUALITY and CALIBRATE env keys.
    for key, step in head["jobs"].get(PLAN_JOB, {}).get("steps", {}).items():
        if key.endswith(PLAN_STEP):
            env = step.get("env") or {}
            for name in ALLOWED_PLAN_ENV_ADDED:
                if name in env and name not in ((base["jobs"].get(PLAN_JOB, {}).get("steps", {})
                                                 .get(key, {})).get("env") or {}):
                    allowed.append(f"job {PLAN_JOB}, step {PLAN_STEP!r}: env {name} added")
                    del env[name]

    for job in sorted(set(base["jobs"]) | set(head["jobs"])):
        if job not in base["jobs"] or job not in head["jobs"]:
            bad.append(f"job {job}: {'removed' if job not in head['jobs'] else 'added'}")
            continue
        b, h = base["jobs"][job], head["jobs"][job]
        for key in JOB_KEYS:
            if not same(b.get(key), h.get(key)):
                bad.append(f"job {job}: {key} differs")
        b_steps = {k.split(" ", 1)[1]: (k, v) for k, v in b["steps"].items()}
        h_steps = {k.split(" ", 1)[1]: (k, v) for k, v in h["steps"].items()}
        for label in sorted(set(b_steps) | set(h_steps)):
            if label not in h_steps:
                bad.append(f"job {job}: step {label!r} removed, renamed or now guarded for way2quran")
            elif label not in b_steps:
                bad.append(f"job {job}: step {label!r} added without a way2quran guard")
            else:
                if not same(b_steps[label][1], h_steps[label][1]):
                    bad.append(f"job {job}: step {label!r} differs")
                elif b_steps[label][0] != h_steps[label][0]:
                    bad.append(f"job {job}: step {label!r} moved")
    return bad, allowed


def guard_violations(doc: dict) -> list[str]:
    """Way2Quran-only markers outside a way2quran-guarded step."""
    found: list[str] = []

    def scan(where: str, value) -> None:
        text = json.dumps(value, default=str)
        for marker in MARKERS:
            if marker in text:
                found.append(f"{where}: {marker!r} outside a step guarded by {W2Q_GUARD}")

    scan("inputs", dispatch_inputs(doc))
    for name, job in (doc.get("jobs") or {}).items():
        scan(f"job {name}", {k: v for k, v in job.items() if k != "steps"})
        for index, step in enumerate(job.get("steps", [])):
            if not guarded_for_way2quran(step):
                scan(f"job {name}, step {step_label(step, index)!r}", step)
    return found


def read_ref(ref: str, path: str = WORKFLOW) -> str:
    proc = subprocess.run(["git", "show", f"{ref}:{path}"], cwd=REPO, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"cannot read {path} at {ref}: {proc.stderr.strip()}")
    return proc.stdout


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", metavar="REF", help="compare the workflow at git ref REF with the working tree")
    mode.add_argument("--guards", action="store_true", help="check where the Way2Quran-only markers appear")
    p.add_argument("--file", type=Path, default=REPO / WORKFLOW, help="the head workflow (default: the working tree)")
    args = p.parse_args(argv)
    head_doc = parse(args.file.read_text(encoding="utf-8"))
    if args.guards:
        found = guard_violations(head_doc)
        for line in found:
            print(line, file=sys.stderr)
        print("guards ok" if not found else f"{len(found)} marker(s) outside a way2quran step")
        return 1 if found else 0
    bad, allowed = compare(parse(read_ref(args.check)), head_doc)
    for line in bad:
        print(f"DIFFERENT: {line}", file=sys.stderr)
    if bad:
        print(f"{len(bad)} difference(s) from {args.check}")
        return 1
    for line in allowed:
        print(f"allowed: {line}")
    print("identical" if not allowed else "identical except the allowed differences")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
