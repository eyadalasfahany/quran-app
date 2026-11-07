<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithOverlayBuilder;
use App\Domains\Hadith\Overlay\OpenItiChapterReader;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use Carbon\CarbonImmutable;

/**
 * Reads one collection for the dev matchers (hadith:match-chapters and hadith:match-book-titles): checks the pinned OpenITI file,
 * scans it and maps the fawazahmed0 snapshot with the importer's own mapper. Writes nothing and stores no text.
 */
final readonly class HadithOpenItiInputs
{
    public function __construct(
        private HadithSourceRegistry $sources,
        private HadithOverlayBuilder $overlays,
        private HadithMapper $mapper,
        private OpenItiChapterReader $reader,
        private HadithImportRepository $repository,
        private HadithDataFiles $dataFiles,
    ) {}

    /**
     * @throws HadithGapBuildException
     * @throws HadithDataFileException
     * @throws \LogicException
     */
    public function load(string $slug, string $openitiDir): OpenItiCollectionInputs
    {
        $file = config('hadith.openiti.files.'.$slug);

        if (! is_array($file) || ! is_array($file['markup'] ?? null)) {
            throw new HadithGapBuildException('Config [hadith.openiti.files] has no chapter markup for ['.$slug.'] (markup_missing).');
        }

        $path = $openitiDir.'/'.basename((string) $file['path']);
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new HadithGapBuildException('The OpenITI file of ['.$slug.'] is missing in the given folder (openiti_file_missing).');
        }

        if (! hash_equals((string) $file['sha256'], hash('sha256', $bytes))) {
            throw new HadithGapBuildException('The OpenITI file of ['.$slug.'] differs from its pin (openiti_sha_mismatch).');
        }

        $scan = $this->reader->scan($bytes, (string) $file['unit_start'], (string) $file['unit_stop'], $file['markup']['chapter'] ?? null, $file['markup']['book'] ?? null);
        $primary = $this->sources->primary();
        $content = $this->repository->source($primary->code());

        if ($content === null) {
            throw new \LogicException('The source ['.$primary->code().'] must be seeded before a chapter match.');
        }

        $originIds = [];

        foreach (['openiti', 'hadithapicom', 'meeatif', 'hadithjson'] as $code) {
            $source = $this->repository->source($code);

            if ($source !== null) {
                $originIds[$code] = (int) $source->getKey();
            }
        }

        $collection = $primary->collection($slug);
        $overlay = $this->overlays->build($slug, $collection, $originIds);
        $mapping = $this->mapper->map($collection, null, (int) $content->getKey(), $primary->code(), $primary->version(), (string) $content->attribution_ar, (string) $content->attribution_en, CarbonImmutable::now('UTC'), $overlay);

        return new OpenItiCollectionInputs(
            $mapping,
            $scan,
            [
                'release' => (string) config('hadith.openiti.release'),
                'doi' => (string) config('hadith.openiti.doi'),
                'version_id' => basename((string) $file['path']),
                'source_file_sha256' => hash('sha256', $bytes),
                'licence' => 'CC BY-NC-SA 4.0, see LICENSE-NOTICE.md',
            ],
            $this->dataFiles->alignment($slug),
        );
    }
}
