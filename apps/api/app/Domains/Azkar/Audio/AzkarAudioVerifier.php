<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Audio;

use App\Domains\Azkar\Exceptions\AudioException;

/**
 * Checks the shipped files on the azkar_audio disk against the manifest (ADR 0040, plan step 14 §4). The default check is
 * presence and size, which is quick enough to run at every start. The full check also hashes every file.
 */
final class AzkarAudioVerifier
{
    public function __construct(
        private readonly AzkarAudioManifest $manifest,
        private readonly AzkarAudioFiles $files,
    ) {}

    /**
     * @return array{shipped: int, verified: int, missing: list<string>, wrong_size: list<string>, wrong_hash: list<string>}
     *
     * @throws AudioException
     */
    public function verify(bool $full = false): array
    {
        $version = $this->files->version();
        $result = ['shipped' => 0, 'verified' => 0, 'missing' => [], 'wrong_size' => [], 'wrong_hash' => []];

        foreach ($this->manifest->shipped() as $track) {
            $result['shipped']++;
            $path = $this->files->absolutePath($version, $track->name);

            if (! is_file($path)) {
                $result['missing'][] = $track->name;

                continue;
            }

            if (filesize($path) !== $track->bytes) {
                $result['wrong_size'][] = $track->name;

                continue;
            }

            if ($full && hash_file('sha256', $path) !== $track->sha256) {
                $result['wrong_hash'][] = $track->name;

                continue;
            }

            $result['verified']++;
        }

        return $result;
    }
}
