import { verifyTanzil } from './verify.ts';

const result = verifyTanzil();

if (result.ok) {
  process.stdout.write('ok\n');
} else {
  for (const failure of result.failures) {
    process.stdout.write(`${failure}\n`);
  }

  process.exitCode = 1;
}
