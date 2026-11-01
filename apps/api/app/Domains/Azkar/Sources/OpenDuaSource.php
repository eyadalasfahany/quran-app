<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Data\ParsedCatalogue;
use App\Domains\Azkar\OpenDua\CatalogueParser;

/**
 * OpenDua v0.0.4 (ADR 0031 §1). A thin wrapper: the parser, the config and the behaviour are unchanged.
 */
final class OpenDuaSource implements AzkarCatalogueSource
{
    public function __construct(private readonly CatalogueParser $parser) {}

    public function code(): string
    {
        return (string) config('azkar.opendua.source_code');
    }

    public function profile(): SourceProfile
    {
        return new SourceProfile(
            code: $this->code(),
            version: (string) config('azkar.opendua.version'),
            pinnedSha256: (string) config('azkar.opendua.catalogue_sha256'),
            collectionId: (string) config('azkar.opendua.collection_id'),
            sourceKey: (string) config('azkar.opendua.source_key'),
            displayName: 'OpenDua',
            importEnabled: (bool) config('azkar.opendua.import_enabled'),
            storeEnglish: (bool) config('azkar.opendua.store_english', false),
            audioRightsVerified: (bool) config('azkar.opendua.audio_rights_verified', false),
            importFlagKey: 'AZKAR_OPENDUA_IMPORT_ENABLED',
        );
    }

    public function parse(string $location): ParsedCatalogue
    {
        return $this->parser->parse($location);
    }
}
