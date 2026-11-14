<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * Lines the canonicalizer could not classify. The run fails when any is recorded (ADR 0089, step 3). Holds line numbers and
 * codes only, never the line's text.
 */
final class UnparsedLines
{
    private const int SUMMARY_LIMIT = 20;

    /** @var list<array{line: int, code: string}> */
    private array $entries = [];

    public function add(int $line, string $code): void
    {
        $this->entries[] = ['line' => $line, 'code' => $code];
    }

    public function isEmpty(): bool
    {
        return $this->entries === [];
    }

    public function count(): int
    {
        return count($this->entries);
    }

    public function summary(): string
    {
        $shown = array_map(
            static fn (array $entry): string => $entry['line'].':'.$entry['code'],
            array_slice($this->entries, 0, self::SUMMARY_LIMIT),
        );

        return $this->count().' ('.implode(', ', $shown).($this->count() > self::SUMMARY_LIMIT ? ', …' : '').')';
    }
}
