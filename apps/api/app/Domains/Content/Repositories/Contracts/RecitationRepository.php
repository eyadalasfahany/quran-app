<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\Recitation;

interface RecitationRepository
{
    /**
     * @param  array{reciter_name: string|null, reciter_name_ar: string|null, style: string|null, qirat: string|null, has_word_segments: bool}  $attributes
     */
    public function upsertForResource(int $resourceId, array $attributes): Recitation;

    public function findForResource(int $resourceId): ?Recitation;

    public function setHasWordSegments(int $id, bool $hasWordSegments): void;

    public function delete(int $id): void;
}
