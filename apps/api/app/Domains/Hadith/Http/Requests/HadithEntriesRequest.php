<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Requests;

use App\Domains\Content\Http\Requests\ChangeCursorRule;
use App\Domains\Content\Packs\ChangeCursor;
use App\Domains\Hadith\Data\HadithEntriesQueryData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * A book's hadith: cursor pages of 50 by default, optionally filtered by chapter number (spec §8).
 */
final class HadithEntriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'cursor' => ['sometimes', 'nullable', 'string', new ChangeCursorRule],
            'chapter' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function toData(): HadithEntriesQueryData
    {
        $limit = $this->validated('limit');
        $chapter = $this->validated('chapter');

        return new HadithEntriesQueryData(
            limit: is_numeric($limit) ? (int) $limit : 50,
            afterPosition: $this->afterPosition(),
            chapterNumber: is_numeric($chapter) ? (int) $chapter : null,
        );
    }

    /**
     * @throws ValidationException
     */
    private function afterPosition(): ?int
    {
        $cursor = $this->validated('cursor');

        if (! is_string($cursor)) {
            return null;
        }

        $position = ChangeCursor::decode($cursor);

        if ($position === null) {
            throw ValidationException::withMessages([
                'cursor' => __('content.cursor_invalid'),
            ]);
        }

        return $position;
    }
}
