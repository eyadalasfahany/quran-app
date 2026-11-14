<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\Certainty;
use App\Domains\Seerah\Enums\Era;
use App\Domains\Seerah\Enums\YearBasis;

/**
 * The year of an event on the age axis, with its Hijri form (V11). The «غير محدد» bucket has every number null.
 *
 * @param  list<Evidence>  $evidence
 */
final readonly class YearRef
{
    public function __construct(
        public YearBasis $basis,
        public ?int $ageFrom,
        public ?int $ageTo,
        public ?Era $era,
        public ?int $hijriFrom,
        public ?int $hijriTo,
        public Certainty $certainty,
        public array $evidence,
    ) {}
}
