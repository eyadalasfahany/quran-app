<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Enums;

/**
 * Where a suggestion was sent from (ADR 0066): the website form or the app's Settings card.
 */
enum SuggestionSource: string
{
    case Website = 'website';
    case App = 'app';
}
