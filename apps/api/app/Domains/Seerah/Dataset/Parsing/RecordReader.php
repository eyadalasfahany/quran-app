<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Validation\IssueBag;
use BackedEnum;

/**
 * Typed, checked access to one decoded record (an associative array). Every problem is reported to the issue bag under the rule
 * it breaks and the record's location, and the accessor returns a safe default, so one bad field never hides the rest of a file.
 */
final class RecordReader
{
    /**
     * @param  array<array-key, mixed>  $record
     */
    public function __construct(
        private readonly array $record,
        private readonly string $where,
        private readonly string $rule,
        private readonly IssueBag $issues,
    ) {}

    /**
     * Reports unknown, missing and out-of-order keys. The record must hold exactly these keys, in this order (V2).
     *
     * @param  list<string>  $keys
     */
    public function expectKeys(array $keys): void
    {
        $actual = array_keys($this->record);

        if ($actual === $keys) {
            return;
        }

        $unknown = array_diff($actual, $keys);
        $missing = array_diff($keys, $actual);

        if ($unknown !== []) {
            $this->issues->error('V2', $this->where, 'unknown key(s): '.implode(', ', $unknown));
        }

        if ($missing !== []) {
            $this->issues->error('V2', $this->where, 'missing key(s): '.implode(', ', $missing));
        }

        if ($unknown === [] && $missing === [] && $actual !== $keys) {
            $this->issues->error('V2', $this->where, 'keys are not in the fixed order');
        }
    }

    public function string(string $key): string
    {
        $value = $this->record[$key] ?? null;

        if (is_string($value) && $value !== '') {
            return $value;
        }

        $this->issues->error($this->rule, $this->where, $key.' must be a non-empty string');

        return '';
    }

    public function nullableString(string $key): ?string
    {
        $value = $this->record[$key] ?? null;

        if ($value === null || (is_string($value) && $value !== '')) {
            return $value;
        }

        $this->issues->error($this->rule, $this->where, $key.' must be a non-empty string or null');

        return null;
    }

    public function nullableInt(string $key): ?int
    {
        $value = $this->record[$key] ?? null;

        if ($value === null || is_int($value)) {
            return $value;
        }

        $this->issues->error($this->rule, $this->where, $key.' must be an integer or null');

        return null;
    }

    public function float(string $key): float
    {
        $value = $this->record[$key] ?? null;

        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $this->issues->error($this->rule, $this->where, $key.' must be a number');

        return 0.0;
    }

    public function int(string $key): int
    {
        $value = $this->record[$key] ?? null;

        if (is_int($value)) {
            return $value;
        }

        $this->issues->error($this->rule, $this->where, $key.' must be an integer');

        return 0;
    }

    /**
     * @template T of BackedEnum
     *
     * @param  class-string<T>  $enum
     * @return T|null
     */
    public function enum(string $key, string $enum, bool $nullable = false): ?BackedEnum
    {
        $value = $this->record[$key] ?? null;

        if ($nullable && $value === null) {
            return null;
        }

        $case = is_string($value) ? $enum::tryFrom($value) : null;

        if ($case === null) {
            $this->issues->error('V18', $this->where, $key.' has an unknown value');
        }

        return $case;
    }

    /**
     * @return list<string>
     */
    public function stringList(string $key): array
    {
        $value = $this->record[$key] ?? null;

        if (! is_array($value) || ! array_is_list($value)) {
            $this->issues->error($this->rule, $this->where, $key.' must be a list');

            return [];
        }

        $items = [];

        foreach ($value as $item) {
            if (! is_string($item)) {
                $this->issues->error($this->rule, $this->where, $key.' must hold strings only');

                continue;
            }

            $items[] = $item;
        }

        return $items;
    }

    /**
     * A list of objects; each is handed to `$read` with its own reader and location.
     *
     * @template T
     *
     * @param  callable(array<array-key, mixed>, string): ?T  $read
     * @return list<T>
     */
    public function objectList(string $key, callable $read): array
    {
        $value = $this->record[$key] ?? null;

        if (! is_array($value) || ! array_is_list($value)) {
            $this->issues->error($this->rule, $this->where, $key.' must be a list');

            return [];
        }

        $items = [];

        foreach ($value as $index => $item) {
            if (! is_array($item)) {
                $this->issues->error($this->rule, $this->where.'.'.$key.'['.$index.']', 'must be an object');

                continue;
            }

            $parsed = $read($item, $this->where.'.'.$key.'['.$index.']');

            if ($parsed !== null) {
                $items[] = $parsed;
            }
        }

        return $items;
    }

    /**
     * A nested object, or null when the key is null.
     *
     * @template T
     *
     * @param  callable(array<array-key, mixed>, string): T  $read
     * @return T|null
     */
    public function object(string $key, callable $read, bool $nullable): mixed
    {
        $value = $this->record[$key] ?? null;

        if ($value === null && $nullable) {
            return null;
        }

        if (! is_array($value) || array_is_list($value)) {
            $this->issues->error($this->rule, $this->where, $key.' must be an object');

            return null;
        }

        return $read($value, $this->where.'.'.$key);
    }

    /**
     * @return array<array-key, mixed>|null
     */
    public function raw(string $key): ?array
    {
        $value = $this->record[$key] ?? null;

        return is_array($value) ? $value : null;
    }

    public function issues(): IssueBag
    {
        return $this->issues;
    }

    public function where(): string
    {
        return $this->where;
    }
}
