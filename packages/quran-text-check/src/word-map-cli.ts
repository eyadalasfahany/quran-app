import { writeWordMapReport } from './word-map-report.ts';

const assessment = writeWordMapReport();

if (assessment.unexpected.length > 0 || assessment.alignmentFailures.length > 0) {
  process.stderr.write(
    `unexpected mismatches: ${assessment.unexpected.length}; alignment failures: ${assessment.alignmentFailures.length}\n`,
  );
  process.exitCode = 1;
}
