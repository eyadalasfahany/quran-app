<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final class QfResponseParser
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function syncPage(array $payload): SyncPage
    {
        $sync = $this->objectField($payload, 'sync');
        $mutations = [];

        foreach ($this->objectList($sync, 'mutations') as $mutation) {
            $mutations[] = $this->mutation($mutation);
        }

        return new SyncPage(
            syncUntilSequence: $this->integer($sync, 'sync_until_sequence'),
            hasMore: $this->boolean($sync, 'has_more'),
            nextPageUrl: $this->nullableString($sync, 'next_page_url'),
            nextSyncToken: $this->string($sync, 'next_sync_token'),
            mutations: $mutations,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<CatalogEntry>
     */
    public function catalog(array $payload, string $key): array
    {
        $entries = [];

        foreach ($this->objectList($payload, $key) as $item) {
            $entries[] = new CatalogEntry(
                id: $this->integer($item, 'id'),
                name: $this->string($item, 'name'),
                authorName: $this->nullableString($item, 'author_name'),
                languageName: $this->nullableString($item, 'language_name'),
                slug: $this->nullableString($item, 'slug'),
                nameAr: $this->arabicTranslatedName($item),
            );
        }

        return $entries;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<ReciterCatalogEntry>
     */
    public function reciters(array $payload): array
    {
        $entries = [];

        foreach ($this->objectList($payload, 'reciters') as $item) {
            $entries[] = new ReciterCatalogEntry(
                id: $this->integer($item, 'id'),
                name: $this->string($item, 'name'),
                style: $this->nestedName($item, 'style'),
                qirat: $this->nestedName($item, 'qirat'),
                translatedName: $this->nestedName($item, 'translated_name'),
            );
        }

        return $entries;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function snapshot(array $payload): Snapshot
    {
        return new Snapshot(
            resourceGroup: $this->string($payload, 'resource_group'),
            resourceId: $this->integer($payload, 'resource_id'),
            resourceContentId: $this->nullableInteger($payload, 'resource_content_id'),
            schemaVersion: $this->integer($payload, 'schema_version'),
            syncSequence: $this->integer($payload, 'sync_sequence'),
            records: $this->objectList($payload, 'records'),
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function mutation(array $payload): Mutation
    {
        $type = $this->string($payload, 'type');

        return new Mutation(
            sequence: $this->integer($payload, 'sequence'),
            type: MutationType::tryFrom($type) ?? throw new QuranFoundationException(
                'Quran Foundation response field [type] is not a known mutation.',
            ),
            resourceGroup: $this->string($payload, 'resource_group'),
            resourceId: $this->integer($payload, 'resource_id'),
            resourceContentId: $this->nullableInteger($payload, 'resource_content_id'),
            recordType: $this->nullableString($payload, 'record_type'),
            recordKey: $this->nullableScalarString($payload, 'record_key'),
            sourceRecordId: $this->nullableScalarString($payload, 'source_record_id'),
            changedAt: $this->nullableString($payload, 'changed_at'),
            data: $this->nullableObject($payload, 'data'),
            snapshotUrl: $this->nullableString($payload, 'snapshot_url'),
            unavailableReason: $this->nullableString($payload, 'unavailable_reason'),
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function string(array $payload, string $key): string
    {
        $value = $payload[$key] ?? null;

        if (! is_string($value)) {
            throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be a string.');
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function nullableString(array $payload, string $key): ?string
    {
        if (! array_key_exists($key, $payload) || $payload[$key] === null) {
            return null;
        }

        return $this->string($payload, $key);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function nullableScalarString(array $payload, string $key): ?string
    {
        if (! array_key_exists($key, $payload) || $payload[$key] === null) {
            return null;
        }

        $value = $payload[$key];

        if (is_string($value)) {
            return $value;
        }

        if (is_int($value)) {
            return (string) $value;
        }

        throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be a string.');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function integer(array $payload, string $key): int
    {
        $value = $payload[$key] ?? null;

        if (! is_int($value)) {
            throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be an integer.');
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function nullableInteger(array $payload, string $key): ?int
    {
        if (! array_key_exists($key, $payload) || $payload[$key] === null) {
            return null;
        }

        return $this->integer($payload, $key);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function boolean(array $payload, string $key): bool
    {
        $value = $payload[$key] ?? null;

        if (! is_bool($value)) {
            throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be a boolean.');
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function objectField(array $payload, string $key): array
    {
        $value = $payload[$key] ?? null;

        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be an object.');
        }

        /** @var array<string, mixed> $value */
        return $value;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null
     */
    private function nullableObject(array $payload, string $key): ?array
    {
        if (! array_key_exists($key, $payload) || $payload[$key] === null) {
            return null;
        }

        return $this->objectField($payload, $key);
    }

    /**
     * The Arabic title from a `?language=ar` catalogue item, only when QF labels it Arabic. Stored as received.
     *
     * @param  array<string, mixed>  $payload
     */
    private function arabicTranslatedName(array $payload): ?string
    {
        if (! array_key_exists('translated_name', $payload) || $payload['translated_name'] === null) {
            return null;
        }

        $translated = $payload['translated_name'];

        if (! is_array($translated) || array_is_list($translated)) {
            throw new QuranFoundationException('Quran Foundation response field [translated_name] must be an object.');
        }

        /** @var array<string, mixed> $translated */
        if (($translated['language_name'] ?? null) !== 'arabic') {
            return null;
        }

        return $this->nullableString($translated, 'name');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function nestedName(array $payload, string $key): ?string
    {
        if (! array_key_exists($key, $payload) || $payload[$key] === null) {
            return null;
        }

        $value = $payload[$key];

        if (! is_array($value) || array_is_list($value)) {
            throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be an object.');
        }

        /** @var array<string, mixed> $value */
        return $this->nullableString($value, 'name');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array<string, mixed>>
     */
    private function objectList(array $payload, string $key): array
    {
        $value = $payload[$key] ?? null;

        if (! is_array($value) || ! array_is_list($value)) {
            throw new QuranFoundationException('Quran Foundation response field ['.$key.'] must be a list.');
        }

        $items = [];

        foreach ($value as $index => $item) {
            if (! is_array($item) || ($item !== [] && array_is_list($item))) {
                throw new QuranFoundationException('Quran Foundation response field ['.$key.'.'.$index.'] must be an object.');
            }

            /** @var array<string, mixed> $item */
            $items[] = $item;
        }

        return $items;
    }
}
