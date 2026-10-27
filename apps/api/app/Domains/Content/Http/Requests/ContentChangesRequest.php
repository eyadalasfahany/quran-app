<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Requests;

use App\Domains\Content\Data\ContentChangesQueryData;
use App\Domains\Content\Packs\ChangeCursor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class ContentChangesRequest extends FormRequest
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
            'resource_id' => ['required', 'integer', 'min:1', Rule::exists('resources', 'id')->where('is_active', 1)],
            'since_version' => ['required', 'integer', 'min:0'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'cursor' => ['sometimes', 'nullable', 'string', new ChangeCursorRule],
        ];
    }

    public function toData(): ContentChangesQueryData
    {
        $cursor = $this->validated('cursor');
        $limit = $this->validated('limit');
        $afterId = null;

        if (is_string($cursor)) {
            $afterId = ChangeCursor::decode($cursor);

            if ($afterId === null) {
                throw ValidationException::withMessages([
                    'cursor' => __('content.cursor_invalid'),
                ]);
            }
        }

        return new ContentChangesQueryData(
            resourceId: $this->integer('resource_id'),
            sinceVersion: $this->integer('since_version'),
            limit: is_numeric($limit) ? (int) $limit : 50,
            afterId: $afterId,
        );
    }
}
