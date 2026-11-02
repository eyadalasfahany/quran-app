<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Audio\AzkarAudioFiles;
use App\Domains\Azkar\Audio\AzkarAudioManifest;
use App\Domains\Azkar\Audio\AzkarAudioTrack;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Resolves a request for one Azkar recording to a file on the azkar_audio disk (ADR 0040, step 14). Every refusal is the
 * same 404: a version other than the pinned one, a name outside the shipped set, or a missing or wrong-sized file.
 * There is no switch (ADR 0045, 2 Nov 2026); a bad recording is removed by a reviewed change.
 */
final class AzkarAudioService
{
    public function __construct(
        private readonly AzkarAudioManifest $manifest,
        private readonly AzkarAudioFiles $files,
    ) {}

    /**
     * @return array{path: string, track: AzkarAudioTrack}
     *
     * @throws ModelNotFoundException
     */
    public function resolve(string $version, string $name): array
    {
        if ($version !== $this->files->version() || ! $this->files->isValidName($name)) {
            $this->notFound();
        }

        $track = $this->manifest->track($name);

        if ($track === null || ! $this->files->hasExpectedSize($track)) {
            $this->notFound();
        }

        return [
            'path' => $this->files->absolutePath($version, $name),
            'track' => $track,
        ];
    }

    /**
     * @throws ModelNotFoundException
     */
    private function notFound(): never
    {
        throw new ModelNotFoundException(__('problems.azkar_audio_not_found'));
    }
}
