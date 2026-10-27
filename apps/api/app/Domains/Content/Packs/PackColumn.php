<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

final readonly class PackColumn
{
    public function __construct(
        public string $name,
        public bool $integer,
        public bool $nullable,
    ) {}
}
