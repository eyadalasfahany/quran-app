<?php

declare(strict_types=1);

namespace App\Domains\Names\Data;

use Spatie\LaravelData\Data;

/** Normalised rows ready for persistence after JSON validation. */
final class NamesImportPlan extends Data
{
    /**
     * @param  array{
     *     list_slug: string,
     *     title_ar: string,
     *     source_label_ar: string,
     *     attribution_ar: string|null,
     *     attribution_en: string|null,
     *     edition_reference: string|null,
     *     source_version: string,
     * }  $list
     * @param  list<array{
     *     id: int,
     *     position: int,
     *     name_slug: string,
     *     name_ar: string,
     *     text_search: string,
     * }>  $names
     */
    public function __construct(
        public readonly array $list,
        public readonly array $names,
        public readonly string $sourceSha256,
    ) {}
}
