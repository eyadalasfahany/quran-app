<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Models;

use App\Domains\Feedback\Enums\SuggestionSource;
use Carbon\CarbonImmutable;
use Database\Factories\SuggestionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

/**
 * A suggestion sent from the website form or the app (ADR 0066). Pruned after the configured retention.
 *
 * @property int $id
 * @property string|null $name
 * @property string $email
 * @property string $message
 * @property string $locale
 * @property SuggestionSource $source
 * @property bool $auto_reply_sent
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 */
final class Suggestion extends Model
{
    /** @use HasFactory<SuggestionFactory> */
    use HasFactory;

    use Prunable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'message',
        'locale',
        'source',
        'auto_reply_sent',
    ];

    protected static function newFactory(): SuggestionFactory
    {
        return SuggestionFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'auto_reply_sent' => 'boolean',
            'source' => SuggestionSource::class,
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return self::query()->where('created_at', '<', now()->subMonths((int) config('feedback.retention_months', 12)));
    }
}
