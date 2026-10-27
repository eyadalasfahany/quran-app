<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync;

trait ReadsSyncRecords
{
    /**
     * @param  array<string, mixed>  $record
     */
    protected function requiredInt(array $record, string $key): int
    {
        if (! array_key_exists($key, $record) || ! is_int($record[$key])) {
            throw new SyncException('Sync record is missing '.$key.'.');
        }

        return $record[$key];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function requiredString(array $record, string $key): string
    {
        if (! array_key_exists($key, $record) || ! is_string($record[$key])) {
            throw new SyncException('Sync record is missing '.$key.'.');
        }

        return $record[$key];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function presentInt(array $record, string $key): ?int
    {
        if (! array_key_exists($key, $record) || $record[$key] === null) {
            return null;
        }

        if (! is_int($record[$key])) {
            throw new SyncException('Sync record field ['.$key.'] must be an integer.');
        }

        return $record[$key];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function optionalString(array $record, string $key): ?string
    {
        if (! array_key_exists($key, $record) || $record[$key] === null) {
            return null;
        }

        if (! is_string($record[$key])) {
            throw new SyncException('Sync record field ['.$key.'] must be a string.');
        }

        return $record[$key];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function intOr(array $record, string $primary, string $fallback): int
    {
        $value = $this->presentInt($record, $primary) ?? $this->presentInt($record, $fallback);

        if ($value === null) {
            throw new SyncException('Sync record is missing '.$primary.'.');
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function stringOr(array $record, string $primary, string $fallback): string
    {
        $value = $this->optionalString($record, $primary) ?? $this->optionalString($record, $fallback);

        if ($value === null) {
            throw new SyncException('Sync record is missing '.$primary.'.');
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function recordType(array $record): string
    {
        $type = $this->optionalString($record, 'record_type');

        if ($type === null || $type === '') {
            throw new SyncException('Sync record is missing record_type.');
        }

        return $type;
    }

    /**
     * @param  array<string, mixed>  $record
     */
    protected function nestedName(array $record, string $key): ?string
    {
        if (! array_key_exists($key, $record) || $record[$key] === null) {
            return null;
        }

        $value = $record[$key];

        if (! is_array($value) || array_is_list($value)) {
            throw new SyncException('Sync record field ['.$key.'] must be an object.');
        }

        $name = $value['name'] ?? null;

        if ($name !== null && ! is_string($name)) {
            throw new SyncException('Sync record field ['.$key.'.name] must be a string.');
        }

        return is_string($name) ? $name : null;
    }
}
