<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Http\Requests;

use App\Domains\Feedback\Data\SuggestionData;
use App\Domains\Feedback\Enums\SuggestionSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreSuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Trims the name and email before validation. The message is trimmed in toData() only.
     */
    protected function prepareForValidation(): void
    {
        $merged = [];

        foreach (['name', 'email'] as $field) {
            $value = $this->input($field);

            if (is_string($value)) {
                $merged[$field] = trim($value);
            }
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'locale' => ['required', 'string', 'in:ar,en'],
            'source' => ['sometimes', Rule::enum(SuggestionSource::class)],
            // Honeypot: a filled value is not a validation error. The service stores and sends nothing (ADR 0066).
            'website' => ['sometimes', 'nullable', 'string', 'max:200'],
        ];
    }

    public function toData(): SuggestionData
    {
        $validated = $this->validated();
        $name = $validated['name'] ?? null;
        $website = $validated['website'] ?? null;

        return new SuggestionData(
            name: is_string($name) && $name !== '' ? $name : null,
            email: (string) $validated['email'],
            message: trim((string) $validated['message']),
            locale: (string) $validated['locale'],
            honeypotFilled: is_string($website) && $website !== '',
            source: SuggestionSource::tryFrom((string) ($validated['source'] ?? '')) ?? SuggestionSource::Website,
        );
    }
}
