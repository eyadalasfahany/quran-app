<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

final readonly class PackColumn
{
    /**
     * @param  bool  $integer  INTEGER column (exclusive with $real)
     * @param  bool  $real  REAL column (ADR 0091: coordinates and drawn positions); false for TEXT
     */
    public function __construct(
        public string $name,
        public bool $integer,
        public bool $nullable,
        public bool $real = false,
    ) {}
}
