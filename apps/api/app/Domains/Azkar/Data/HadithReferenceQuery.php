<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

final class HadithReferenceQuery extends Data
{
    public function __construct(
        public readonly string $text,
        public readonly ?int $page = null,
    ) {}
}
