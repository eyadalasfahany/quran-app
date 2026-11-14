<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\Origin;
use App\Domains\Seerah\Enums\PlaceKind;

/**
 * One gazetteer entry. `names_in_book` are the exact strings the book uses; `evidence` quotes the book naming the place.
 *
 * @param  list<string>  $namesInBook
 * @param  list<Evidence>  $evidence
 * @param  list<Flag>  $flags
 */
final readonly class Place
{
    public function __construct(
        public string $id,
        public ?string $parent,
        public PlaceKind $kind,
        public string $nameAr,
        public array $namesInBook,
        public ?string $nameEn,
        public ?Geo $geo,
        public array $evidence,
        public Origin $origin,
        public array $flags,
        public ?string $note,
    ) {}
}
