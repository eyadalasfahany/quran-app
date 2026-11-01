<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * A catalogue file read as bytes, hashed, and decoded. The hash is taken before decoding.
 */
final class ParsedCatalogue extends Data
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public readonly string $path,
        public readonly string $sha256,
        public readonly int $bytes,
        public readonly array $data,
    ) {}
}
