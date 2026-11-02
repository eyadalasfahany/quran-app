<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Audio\AzkarAudioVerifier;
use App\Domains\Azkar\Exceptions\AudioException;
use Illuminate\Console\Command;

/**
 * Checks the shipped Azkar recordings against the manifest (ADR 0040, step 14). The default check is presence and
 * size; --full hashes every file. Run at container start (docker/start-web.sh) without --full.
 */
final class VerifyAzkarAudioCommand extends Command
{
    protected $signature = 'azkar:audio-verify
        {--full : Also check the SHA-256 of every file (slower; the default checks presence and size)}';

    protected $description = 'Check the shipped Azkar recordings on the azkar_audio disk against the pinned manifest (ADR 0040).';

    public function handle(AzkarAudioVerifier $verifier): int
    {
        try {
            $result = $verifier->verify((bool) $this->option('full'));
        } catch (AudioException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $problems = count($result['missing']) + count($result['wrong_size']) + count($result['wrong_hash']);

        $this->table(['Metric', 'Value'], [
            ['shipped', $result['shipped']],
            ['verified', $result['verified']],
            ['missing', count($result['missing'])],
            ['wrong size', count($result['wrong_size'])],
            ['wrong hash', count($result['wrong_hash'])],
            ['checked', $this->option('full') ? 'presence, size and SHA-256' : 'presence and size'],
        ]);

        foreach (['missing' => $result['missing'], 'wrong size' => $result['wrong_size'], 'wrong hash' => $result['wrong_hash']] as $label => $names) {
            if ($names !== []) {
                $this->line($label.': '.implode(', ', array_slice($names, 0, 20)).(count($names) > 20 ? ' …' : ''));
            }
        }

        if ($problems > 0) {
            $this->error('Azkar audio is incomplete. Run azkar:audio-sync to fetch the missing files.');

            return self::FAILURE;
        }

        $this->info('Azkar audio verified.');

        return self::SUCCESS;
    }
}
