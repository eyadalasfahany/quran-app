<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

/**
 * Maps Dorar payloads. Dorar's response schema is not known yet, so there is nothing to map and every call throws.
 * It returns no domain types: once the schema exists, it returns plain field arrays and the Azkar Sources build the DTOs.
 */
final class DorarResponseMapper
{
    public function map(string $text, ?int $page): never
    {
        throw DorarMappingUnavailableException::awaitingApiDocumentation();
    }
}
