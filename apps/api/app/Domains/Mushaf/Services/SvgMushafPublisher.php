<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Content\Services\ResourceVersionService;
use App\Domains\Mushaf\Exceptions\SvgMushafException;
use App\Domains\Mushaf\Exceptions\UnknownSvgMushafException;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafPackRepository;
use Illuminate\Support\Facades\DB;

/**
 * Publishes one imported edition as a content resource (ADR 0090 decisions 5, 9 and 12). Publishing is a deliberate step: an
 * unchanged edition is not bumped, and Hafs waits for its word boxes unless the local-only flag says otherwise.
 */
final class SvgMushafPublisher
{
    private const string SOURCE_CODE = 'quran_ws';

    public function __construct(
        private readonly SvgMushafPackRepository $mushafs,
        private readonly ResourceRepository $resources,
        private readonly ResourceVersionService $versions,
        private readonly PackBuilder $packs,
    ) {}

    /**
     * @throws UnknownSvgMushafException
     * @throws SvgMushafException
     */
    public function publish(string $key, bool $deferPack, bool $withoutWordBoxes): Resource
    {
        $edition = $this->edition($key);
        $mushaf = $this->mushafs->findByKey($key);

        if ($mushaf === null) {
            throw new SvgMushafException('The mushaf ['.$key.'] is not imported. Run mushaf:import first.');
        }

        if ($mushaf->page_count !== (int) config('mushaf.pages')) {
            throw new SvgMushafException('The mushaf ['.$key.'] has '.$mushaf->page_count.' pages, not '.(int) config('mushaf.pages').'.');
        }

        $approved = WordBoxApproval::isApproved($mushaf);

        if ($withoutWordBoxes && app()->environment('production')) {
            throw new SvgMushafException('--without-word-boxes is for local and test use and is refused in production.');
        }

        if ($withoutWordBoxes && $approved) {
            throw new SvgMushafException('--without-word-boxes cannot be used once the word boxes are approved: the pack would still carry them.');
        }

        if ($key === 'hafs' && ! $approved && ! $withoutWordBoxes) {
            throw new SvgMushafException('Hafs is not published until its word boxes are approved. Pass --without-word-boxes to publish pages and regions only.');
        }

        $sourceId = $this->resources->sourceId(self::SOURCE_CODE);

        if ($sourceId === null) {
            throw new SvgMushafException('The content source ['.self::SOURCE_CODE.'] is missing. Run the migrations.');
        }

        $resource = $this->resources->findBySource($sourceId, ResourceGroup::SvgMushafs, $key)
            ?? $this->resources->create([
                'source_id' => $sourceId,
                'group' => ResourceGroup::SvgMushafs,
                'source_key' => $key,
                'name' => $edition['name'],
                'name_ar' => $edition['name_ar'],
                'language_code' => 'ar',
                'direction' => TextDirection::Rtl,
                'version' => 0,
                'changes_floor_version' => 0,
                'is_active' => true,
            ]);

        $fingerprint = $this->fingerprint($mushaf, $approved);

        if ($resource->import_fingerprint !== null && hash_equals($resource->import_fingerprint, $fingerprint)) {
            return $resource;
        }

        DB::transaction(fn () => $this->versions->bumpWithFloor($resource));

        // The fingerprint is stored only after the pack is built or queued, so a failed build is retried by the next publish.
        if ($deferPack) {
            BuildContentPackJob::dispatch($resource->id);
        } else {
            $this->packs->build($resource);
        }

        $resource->import_fingerprint = $fingerprint;
        $this->resources->save($resource);

        return $resource;
    }

    /**
     * Whether the pack of this edition would carry word boxes now.
     */
    public function includesWordBoxes(string $key): bool
    {
        $mushaf = $this->mushafs->findByKey($key);

        return $mushaf !== null && WordBoxApproval::isApproved($mushaf);
    }

    /**
     * Covers every page digest in page order and every region in order, so an edit to either one bumps the version.
     */
    private function fingerprint(SvgMushaf $mushaf, bool $includeBoxes): string
    {
        $pages = hash_init('sha256');

        foreach ($this->mushafs->pages($mushaf->id) as $page) {
            hash_update($pages, $page['page'].':'.$page['gz_sha256']."\n");
        }

        $regions = hash_init('sha256');

        foreach ($this->mushafs->regions($mushaf->id) as $region) {
            hash_update($regions, implode(':', [
                $region['page'],
                $region['surah'],
                $region['ayah'],
                $region['label_x'] ?? '',
                $region['label_y'] ?? '',
                $region['polygon'],
            ])."\n");
        }

        return hash('sha256', json_encode([
            $mushaf->source_commit,
            $mushaf->page_count,
            hash_final($pages),
            hash_final($regions),
            $includeBoxes ? $mushaf->word_boxes_digest : 'none',
        ], JSON_THROW_ON_ERROR));
    }

    /**
     * @return array{folder: string, edition_year: int, expected_ayahs: int|null, name: string, name_ar: string}
     *
     * @throws UnknownSvgMushafException
     */
    private function edition(string $key): array
    {
        $editions = config('mushaf.editions');

        if (! is_array($editions) || ! array_key_exists($key, $editions)) {
            throw new UnknownSvgMushafException('Unknown mushaf ['.$key.'].');
        }

        return $editions[$key];
    }
}
