// Runs `npm audit` and fails on any high or critical advisory that isn't in .github/audit-allowlist.json.
// Every allowlist entry needs a reason and a reviewBy date. An expired or unused entry also fails,
// so an exception can't outlive the problem it covers.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BLOCKING = new Set(['high', 'critical']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Only advisory objects in `via` are real findings; strings there point at another vulnerable package.
export function blockingAdvisories(report) {
  const advisories = new Map();

  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = via.url.split('/').pop();
      advisories.set(id, { id, package: via.name, severity: via.severity, title: via.title });
    }
  }

  return [...advisories.values()];
}

export function evaluate(advisories, allowlist, today) {
  const failures = [];
  const allowed = [];

  for (const entry of allowlist) {
    if (!entry.id || !entry.reason || !DATE.test(entry.reviewBy ?? '')) {
      failures.push(`Allowlist entry ${entry.id ?? '(no id)'} needs an id, a reason and a reviewBy date (YYYY-MM-DD).`);
    }
  }

  for (const advisory of advisories) {
    const entry = allowlist.find((candidate) => candidate.id === advisory.id);
    const label = `${advisory.id} (${advisory.severity}, ${advisory.package}): ${advisory.title}`;

    if (!entry) {
      failures.push(`Not allowlisted: ${label}`);
    } else if (entry.reviewBy < today) {
      failures.push(`Allowlist entry expired on ${entry.reviewBy}: ${label}. Fix it, or re-review and move the date.`);
    } else {
      allowed.push(`Allowed until ${entry.reviewBy}: ${label}`);
    }
  }

  for (const entry of allowlist) {
    if (entry.id && !advisories.some((advisory) => advisory.id === entry.id)) {
      failures.push(`Unused allowlist entry ${entry.id}: the advisory is gone, so remove the entry.`);
    }
  }

  return { failures, allowed };
}

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // npm audit exits 1 whenever it finds anything; the report is still on stdout.
    if (typeof error.stdout === 'string' && error.stdout.trim() !== '') return error.stdout;
    throw error;
  }
}

function main() {
  const report = JSON.parse(runAudit());
  if (report.error) {
    throw new Error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
  }

  const allowlistPath = fileURLToPath(new URL('../audit-allowlist.json', import.meta.url));
  const { advisories: allowlist } = JSON.parse(readFileSync(allowlistPath, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const { failures, allowed } = evaluate(blockingAdvisories(report), allowlist, today);

  for (const line of allowed) console.log(line);
  for (const line of failures) console.error(line);

  if (failures.length > 0) process.exit(1);
  console.log('npm audit: no unallowed high or critical advisories.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
