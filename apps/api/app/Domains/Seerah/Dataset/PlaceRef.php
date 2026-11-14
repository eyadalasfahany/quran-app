<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\PlaceBasis;

/**
 * The place of an event: the gazetteer id, how the book states it, its quotes, and the other places the span names.
 *
 * @param  list<Evidence>  $evidence
 * @param  list<string>  $also
 */
final readonly class PlaceRef
{
    public function __construct(
        public string $id,
        public PlaceBasis $basis,
        public array $evidence,
        public array $also,
    ) {}
}
