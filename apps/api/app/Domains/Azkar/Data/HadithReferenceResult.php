<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

final class HadithReferenceResult extends Data
{
    public const string PROVIDER_DORAR = 'dorar';

    public const string PROVIDER_NONE = 'none';

    /**
     * @param  list<HadithReference>  $references
     * @param  self::PROVIDER_*  $provider
     */
    public function __construct(
        public readonly array $references,
        public readonly string $provider,
        public readonly CarbonImmutable $retrievedAt,
    ) {}

    public static function none(CarbonImmutable $retrievedAt): self
    {
        return new self([], self::PROVIDER_NONE, $retrievedAt);
    }
}
