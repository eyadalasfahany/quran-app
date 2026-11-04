<?php

declare(strict_types=1);

namespace App\Domains\Names\Data;

use Spatie\LaravelData\Data;

final class ImportReport extends Data
{
    public const string STATUS_REFUSED = 'refused';

    public const string STATUS_NOOP = 'noop';

    public const string STATUS_INVALID = 'invalid';

    public const string STATUS_IMPORTED = 'imported';

    public const string STATUS_UNCHANGED = 'unchanged';

    /**
     * @param  array<string, mixed>  $content
     */
    public function __construct(
        public readonly string $status,
        public readonly array $content = [],
    ) {}
}
