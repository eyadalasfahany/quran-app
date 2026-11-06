<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Data;

use App\Domains\Feedback\Enums\SuggestionSource;
use Spatie\LaravelData\Data;

/**
 * A validated suggestion from the website form. Carries values between layers only (ADR 0006).
 */
final class SuggestionData extends Data
{
    public function __construct(
        public readonly ?string $name,
        public readonly string $email,
        public readonly string $message,
        public readonly string $locale,
        public readonly bool $honeypotFilled,
        public readonly SuggestionSource $source = SuggestionSource::Website,
    ) {}
}
