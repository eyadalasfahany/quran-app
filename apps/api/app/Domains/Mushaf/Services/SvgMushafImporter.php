<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Mushaf\Exceptions\SvgMushafCheckException;
use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Exceptions\TqpEncodeException;
use App\Domains\Mushaf\Exceptions\UnknownSvgMushafException;
use App\Domains\Mushaf\Packs\Tqp\TqpEncoder;
use App\Domains\Mushaf\Records\SvgMushafImportReport;
use App\Domains\Mushaf\Records\SvgMushafPlan;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafRepository;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use App\Domains\Mushaf\Sources\SvgMushafStore;
use Illuminate\Support\Facades\DB;
use JsonException;

/**
 * Imports one pinned quran-svg mushaf (ADR 0090 decisions 5 and 7). Check A1 runs on every file through the downloader. Check A2
 * runs over the whole page set. Only then are the .svg.gz files written and the database replaced, in one transaction.
 */
final class SvgMushafImporter
{
    private const int SURAH_COUNT = 114;

    public function __construct(
        private readonly SvgMushafDownloader $downloader,
        private readonly SvgMushafStore $store,
        private readonly SvgMushafRepository $repository,
        private readonly TqpEncoder $encoder,
    ) {}

    /**
     * @throws UnknownSvgMushafException
     * @throws SvgMushafSourceException
     * @throws SvgMushafCheckException
     */
    public function import(string $key, bool $offline): SvgMushafImportReport
    {
        $edition = $this->edition($key);
        $folder = $edition['folder'];
        $base = $this->downloader->base($folder);
        $pageCount = (int) config('mushaf.pages');

        $ayahCounts = $this->ayahCounts($folder, $offline);
        $found = [];
        $regions = [];
        $tqp = [];

        // Pass 1: every page SVG (checked and cached), its TQP1 container digest, and every page JSON. Only digests are kept.
        for ($page = 1; $page <= $pageCount; $page++) {
            $svg = $this->downloader->bytes($folder, $this->svgPath($page), $offline);
            $tqp[$page] = $this->tqpDigest($svg, $page);

            foreach ($this->pageRegions($this->downloader->bytes($folder, $this->jsonPath($page), $offline), $page) as $region) {
                $regions[] = $region;
                $found[$region['surah']][$region['ayah']] = true;
            }
        }

        $total = $this->assertAyahCounts($key, $ayahCounts, $found, $edition['expected_ayahs']);

        // Pass 2, only after A2 and the encoding of every page: gzip each page beside its cached SVG and record the gzip digest.
        $pages = [];
        $svgBytes = 0;
        $gzipBytes = 0;

        for ($page = 1; $page <= $pageCount; $page++) {
            $relative = $this->svgPath($page);
            $svg = $this->downloader->bytes($folder, $relative, $offline);
            $pin = $this->downloader->pin($folder, $relative);
            $gzip = $this->store->writeGzip($base, $relative, $svg);

            $pages[] = [
                'page' => $page,
                'svg_blob_sha' => $pin['sha'],
                'svg_bytes' => $pin['bytes'],
                'gz_sha256' => $gzip['sha256'],
                'gz_bytes' => $gzip['bytes'],
                'tqp_sha256' => $tqp[$page]['sha256'],
                'tqp_bytes' => $tqp[$page]['bytes'],
            ];
            $svgBytes += $pin['bytes'];
            $gzipBytes += $gzip['bytes'];
        }

        $plan = new SvgMushafPlan(
            key: $key,
            folder: $folder,
            editionYear: $edition['edition_year'],
            commit: (string) config('mushaf.commit'),
            pageCount: $pageCount,
            ayahCount: $total,
            pages: $pages,
            regions: $regions,
        );

        DB::transaction(fn () => $this->repository->replace($plan));

        return new SvgMushafImportReport($key, count($pages), count($regions), $total, $svgBytes, $gzipBytes);
    }

    /**
     * @return array{folder: string, edition_year: int, expected_ayahs: int|null}
     *
     * @throws UnknownSvgMushafException
     */
    private function edition(string $key): array
    {
        $editions = config('mushaf.editions');

        if (! is_array($editions) || ! array_key_exists($key, $editions)) {
            $known = is_array($editions) ? implode(', ', array_keys($editions)) : '';

            throw new UnknownSvgMushafException('Unknown mushaf ['.$key.']. Use one of: '.$known.'.');
        }

        $edition = $editions[$key];

        return [
            'folder' => (string) $edition['folder'],
            'edition_year' => (int) $edition['edition_year'],
            'expected_ayahs' => $edition['expected_ayahs'] === null ? null : (int) $edition['expected_ayahs'],
        ];
    }

    /**
     * surah.json: the ayah count of every surah, keyed by surah number.
     *
     * @return array<int, int>
     *
     * @throws SvgMushafSourceException
     */
    private function ayahCounts(string $folder, bool $offline): array
    {
        try {
            $surahs = json_decode($this->downloader->bytes($folder, 'json/surah.json', $offline), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new SvgMushafSourceException('surah.json is not valid JSON.');
        }

        $counts = [];

        foreach (is_array($surahs) ? $surahs : [] as $surah) {
            if (! is_array($surah) || ! is_int($surah['number'] ?? null) || ! is_int($surah['ayahCount'] ?? null)) {
                throw new SvgMushafSourceException('surah.json has a malformed entry.');
            }

            $counts[$surah['number']] = $surah['ayahCount'];
        }

        ksort($counts);

        if (array_keys($counts) !== range(1, self::SURAH_COUNT)) {
            throw new SvgMushafSourceException('surah.json does not list surahs 1 to '.self::SURAH_COUNT.' once each.');
        }

        return $counts;
    }

    /**
     * One page's ayah polygons as region rows. An ayah listed twice on one page is refused, because the table holds one row
     * per ayah per page. An ayah that runs on from the previous page is listed with `continuation: true` and no label point
     * (x and y null); only such an entry may lack it.
     *
     * @return list<array{page: int, surah: int, ayah: int, label_x: float|null, label_y: float|null, polygon: string}>
     *
     * @throws SvgMushafSourceException
     * @throws SvgMushafCheckException
     */
    private function pageRegions(string $json, int $page): array
    {
        try {
            $items = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new SvgMushafSourceException('Page '.$page.' is not valid JSON.');
        }

        if (! is_array($items) || ! array_is_list($items)) {
            throw new SvgMushafSourceException('Page '.$page.' is not a list of ayah entries.');
        }

        $seen = [];
        $regions = [];

        foreach ($items as $item) {
            if (! is_array($item)
                || ! is_int($item['surahNumber'] ?? null)
                || ! is_int($item['ayahNumber'] ?? null)
                || ! is_string($item['polygon'] ?? null)
                || ! $this->hasLabel($item)
            ) {
                throw new SvgMushafSourceException('Page '.$page.' has a malformed ayah entry.');
            }

            $surah = $item['surahNumber'];
            $ayah = $item['ayahNumber'];

            if ($surah < 1 || $surah > self::SURAH_COUNT || $ayah < 1) {
                throw new SvgMushafSourceException('Page '.$page.' lists surah '.$surah.' ayah '.$ayah.', which does not exist.');
            }

            if (isset($seen[$surah][$ayah])) {
                throw new SvgMushafCheckException('Page '.$page.' lists surah '.$surah.' ayah '.$ayah.' twice.');
            }

            $seen[$surah][$ayah] = true;
            $regions[] = [
                'page' => $page,
                'surah' => $surah,
                'ayah' => $ayah,
                'label_x' => is_numeric($item['x']) ? (float) $item['x'] : null,
                'label_y' => is_numeric($item['y']) ? (float) $item['y'] : null,
                'polygon' => $item['polygon'],
            ];
        }

        return $regions;
    }

    /**
     * A numeric label point, or none at all on a continuation entry.
     *
     * @param  array<mixed>  $item
     */
    private function hasLabel(array $item): bool
    {
        $x = $item['x'] ?? null;
        $y = $item['y'] ?? null;

        if (is_numeric($x) && is_numeric($y)) {
            return true;
        }

        return $x === null && $y === null && ($item['continuation'] ?? null) === true;
    }

    /**
     * Check A2. Returns the total ayah count.
     *
     * @param  array<int, int>  $ayahCounts
     * @param  array<int, array<int, bool>>  $found
     *
     * @throws SvgMushafCheckException
     */
    private function assertAyahCounts(string $key, array $ayahCounts, array $found, ?int $expectedTotal): int
    {
        $failures = [];
        $total = 0;

        foreach ($ayahCounts as $surah => $expected) {
            $count = count($found[$surah] ?? []);
            $total += $count;

            if ($count !== $expected) {
                $failures[] = 'surah '.$surah.': found '.$count.', expected '.$expected;
            }
        }

        $expectedSum = array_sum($ayahCounts);

        if ($total !== $expectedSum) {
            $failures[] = 'total '.$total.', expected '.$expectedSum;
        }

        if ($expectedTotal !== null && $total !== $expectedTotal) {
            $failures[] = 'total '.$total.', expected '.$expectedTotal.' for ['.$key.']';
        }

        if ($failures !== []) {
            throw new SvgMushafCheckException('Check A2 failed for ['.$key.']: '.implode('; ', $failures).'.');
        }

        return $total;
    }

    /**
     * @return array{sha256: string, bytes: int}
     *
     * @throws SvgMushafCheckException when the page cannot be encoded
     */
    private function tqpDigest(string $svg, int $page): array
    {
        try {
            $container = $this->encoder->container($svg);
        } catch (TqpEncodeException $exception) {
            throw new SvgMushafCheckException('Page '.$page.': '.$exception->getMessage());
        }

        return ['sha256' => hash('sha256', $container), 'bytes' => strlen($container)];
    }

    private function svgPath(int $page): string
    {
        return sprintf('svg/%03d.svg', $page);
    }

    private function jsonPath(int $page): string
    {
        return sprintf('json/%03d.json', $page);
    }
}
