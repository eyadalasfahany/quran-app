<?php

declare(strict_types=1);

use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Seerah\Enums\ImportMode;
use App\Domains\Seerah\Import\SeerahImportResult;
use App\Domains\Seerah\Import\SeerahImportRows;
use App\Domains\Seerah\Repositories\Contracts\SeerahImportRepository;
use App\Domains\Seerah\Services\SeerahImporter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\SeerahFixture;

// Placeholder data only (ADR 0089). The importer runs on the fixture folder, so no book text reaches a test.

/**
 * Writes the passing fixture folder (optionally changed) and imports it through the service, without a pack.
 *
 * @param  callable(array<string, array<string, mixed>>): array<string, array<string, mixed>>|null  $change
 */
function seerahFixtureImport(bool $release = false, bool $production = false, ?callable $change = null): SeerahImportResult
{
    $build = SeerahFixture::build();
    $directory = SeerahFixture::directory();
    $files = SeerahFixture::files($build);

    if ($change !== null) {
        $files = $change($files);
    }

    SeerahFixture::write($directory, $build, $files);

    return app(SeerahImporter::class)->run(
        $directory,
        $release ? ImportMode::Release : ImportMode::Structure,
        $build,
        false,
        true,
        $production,
    );
}

function seerahPackOf(int $resourceId): ContentPackData
{
    return app(PackBuilder::class)->build(Resource::query()->findOrFail($resourceId));
}

/**
 * The pack's SQLite database, opened from the stored gzip.
 */
function seerahPackOpen(?string $gzipped): PDO
{
    expect($gzipped)->toBeString();

    $raw = gzdecode((string) $gzipped);
    expect($raw)->toBeString();

    $path = tempnam(sys_get_temp_dir(), 'seerah-pack-');
    expect($path)->toBeString();

    file_put_contents((string) $path, (string) $raw);

    return new PDO('sqlite:'.$path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

/**
 * @return list<array<string, mixed>>
 */
function seerahPackRows(PDO $pdo, string $table): array
{
    /** @var list<array<string, mixed>> $rows */
    $rows = $pdo->query('SELECT * FROM '.$table.' ORDER BY rowid')->fetchAll();

    return $rows;
}

/**
 * Makes the imported book served: a real pack built from the stored rows (the manifest and the endpoint read it).
 */
function seerahServe(int $resourceId): ContentPackData
{
    return seerahPackOf($resourceId);
}

/**
 * A repository that corrupts one stored paragraph after the write, so the integrity check must fail and roll back.
 */
final class SeerahCorruptingImportRepository implements SeerahImportRepository
{
    public function __construct(private readonly SeerahImportRepository $inner) {}

    public function hasBook(int $resourceId): bool
    {
        return $this->inner->hasBook($resourceId);
    }

    public function replace(int $resourceId, SeerahImportRows $rows, int $sourceId, CarbonImmutable $importedAt): void
    {
        $this->inner->replace($resourceId, $rows, $sourceId, $importedAt);

        DB::table('seerah_paragraphs')
            ->where('resource_id', $resourceId)
            ->where('id', 2)
            ->update(['text_ar' => 'FIXTURE altered paragraph']);
    }

    public function paragraphs(int $resourceId): array
    {
        return $this->inner->paragraphs($resourceId);
    }
}
