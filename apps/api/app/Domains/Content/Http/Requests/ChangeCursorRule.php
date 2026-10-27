<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Requests;

use App\Domains\Content\Packs\ChangeCursor;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class ChangeCursorRule implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ChangeCursor::decode($value) === null) {
            $fail(__('content.cursor_invalid'));
        }
    }
}
