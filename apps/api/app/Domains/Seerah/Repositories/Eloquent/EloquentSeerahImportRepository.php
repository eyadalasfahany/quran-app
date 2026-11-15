<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Repositories\Eloquent;

use App\Domains\Seerah\Import\SeerahImportRows;
use App\Domains\Seerah\Models\SeerahBook;
use App\Domains\Seerah\Models\SeerahEvent;
use App\Domains\Seerah\Models\SeerahEventEvidence;
use App\Domains\Seerah\Models\SeerahMapLevel;
use App\Domains\Seerah\Models\SeerahMapPosition;
use App\Domains\Seerah\Models\SeerahMapRoutePath;
use App\Domains\Seerah\Models\SeerahMilestone;
use App\Domains\Seerah\Models\SeerahParagraph;
use App\Domains\Seerah\Models\SeerahPlace;
use App\Domains\Seerah\Models\SeerahRoute;
use App\Domains\Seerah\Models\SeerahRouteStop;
use App\Domains\Seerah\Models\SeerahSection;
use App\Domains\Seerah\Repositories\Contracts\SeerahImportRepository;
use App\Support\Repositories\EloquentRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends EloquentRepository<SeerahBook>
 */
final class EloquentSeerahImportRepository extends EloquentRepository implements SeerahImportRepository
{
    private const int CHUNK = 200;

    /**
     * Table => model, in write order. The delete runs in the reverse order.
     *
     * @var array<string, class-string<Model>>
     */
    private const array MODELS = [
        'seerah_books' => SeerahBook::class,
        'seerah_sections' => SeerahSection::class,
        'seerah_paragraphs' => SeerahParagraph::class,
        'seerah_places' => SeerahPlace::class,
        'seerah_map_levels' => SeerahMapLevel::class,
        'seerah_map_positions' => SeerahMapPosition::class,
        'seerah_routes' => SeerahRoute::class,
        'seerah_route_stops' => SeerahRouteStop::class,
        'seerah_map_route_paths' => SeerahMapRoutePath::class,
        'seerah_events' => SeerahEvent::class,
        'seerah_event_evidence' => SeerahEventEvidence::class,
        'seerah_milestones' => SeerahMilestone::class,
    ];

    protected function model(): string
    {
        return SeerahBook::class;
    }

    public function hasBook(int $resourceId): bool
    {
        return SeerahBook::query()->where('resource_id', $resourceId)->exists();
    }

    public function replace(int $resourceId, SeerahImportRows $rows, int $sourceId, CarbonImmutable $importedAt): void
    {
        foreach (array_reverse(array_values(self::MODELS)) as $model) {
            $model::query()->where('resource_id', $resourceId)->delete();
        }

        foreach (self::MODELS as $table => $model) {
            $extra = $table === 'seerah_books'
                ? ['source_id' => $sourceId, 'imported_at' => $importedAt->format('Y-m-d H:i:s.u')]
                : [];

            foreach (array_chunk($rows->rows($table), self::CHUNK) as $chunk) {
                $model::query()->insert(array_map(
                    static fn (array $row): array => ['resource_id' => $resourceId] + $extra + $row,
                    $chunk,
                ));
            }
        }
    }

    public function paragraphs(int $resourceId): array
    {
        $stored = [];

        foreach (SeerahParagraph::query()->where('resource_id', $resourceId)->get(['id', 'text_ar', 'text_sha256']) as $paragraph) {
            $stored[(int) $paragraph->id] = [
                'text_ar' => (string) $paragraph->text_ar,
                'text_sha256' => (string) $paragraph->text_sha256,
            ];
        }

        return $stored;
    }
}
