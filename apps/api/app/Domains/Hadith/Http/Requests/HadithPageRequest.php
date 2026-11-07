<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Requests;

use App\Domains\Content\Http\Requests\ChangeCursorRule;
use App\Domains\Content\Packs\ChangeCursor;
use App\Domains\Hadith\Data\HadithPageQueryData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * Books and chapters: cursor pages of 100 by default (spec §8, open question 6).
 */
final class HadithPageRequest extends FormRequest
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
        ];
    }

    public function toData(): HadithPageQueryData
    {
        $limit = $this->validated('limit');

        return new HadithPageQueryData(
            limit: is_numeric($limit) ? (int) $limit : 100,
            afterPosition: $this->afterPosition(),
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
