<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use App\Domains\Content\Models\AzkarRecording;
use Illuminate\Support\Facades\Storage;

/**
 * ADR 0040 step 14 §7 (fail closed): an Azkar pack that lists recordings is built only when every listed file is on the
 * azkar_audio disk at the size the row records. A pack with no recordings never reads the audio disk.
 */
final class AzkarAudioReadiness
{
    public const string DISK = 'azkar_audio';

    /** The served path: /api/v1/azkar/audio/{version}/{file}. Anything else is a row this check cannot vouch for. */
    private const string SERVED_PATH = '#^/api/v1/azkar/audio/([0-9.]+)/(OD-\d{3}(?:-\d{1,2})?\.mp3)$#';

    /**
     * @throws PackBuildException
     */
    public function assertReady(int $resourceId): void
    {
        $rows = AzkarRecording::query()
            ->where('resource_id', $resourceId)
            ->get(['recording_key', 'remote_url', 'size_bytes']);

        if ($rows->isEmpty()) {
            return;
        }

        $problems = [];

        foreach ($rows as $row) {
            if (preg_match(self::SERVED_PATH, $row->remote_url, $matches) !== 1) {
                $problems[] = $row->recording_key;

                continue;
            }

            $path = Storage::disk(self::DISK)->path($matches[1].'/'.$matches[2]);

            if (! is_file($path) || filesize($path) !== (int) $row->size_bytes) {
                $problems[] = $matches[2];
            }
        }

        if ($problems !== []) {
            throw new PackBuildException(
                'Azkar audio is missing or the wrong size for '.count($problems).' recording(s): '.implode(', ', array_unique($problems)).'. The pack is not built.',
            );
        }
    }
}
